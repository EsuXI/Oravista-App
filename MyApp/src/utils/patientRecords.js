import { API_BASE_URL } from '../config/config';
import { requestJson, requireArray, displayDate } from './patientData';

const AI_BASE_URL = (process.env.EXPO_PUBLIC_AI_BASE_URL?.trim() ||
  'https://oravista-ai-engine-474976105474.asia-southeast1.run.app').replace(/\/+$/, '');

// The service uses specific 404 responses for assessments that do not exist yet.
// Unknown routes and genuine request failures must still be shown as errors.
export async function fetchPatientHealth(userId, section) {
  const labels = { analytics: 'Health history', 'oral-health-risk': 'Risk assessment' };
  const label = labels[section];
  if (!label || userId == null) throw new Error('Please sign in again to load your health information.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${AI_BASE_URL}/api/patient/get/${encodeURIComponent(userId)}/${section}`, { signal: controller.signal, cache: 'no-store' });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => undefined);
    const detail = typeof data?.detail === 'string' ? data.detail : '';
    const missingRecord = section === 'analytics'
      ? /^Analytics for patient .+ not found\.?$/i.test(detail)
      : /^No risk assessment found for patient ID .+\.?$/i.test(detail);
    if (response.status === 404 && missingRecord) return null;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error(`${label} could not be accessed. Please sign in again.`);
      throw new Error(`${label} is temporarily unavailable from the health service. Please try again.`);
    }
    if (data === undefined) throw new Error(`${label} could not be read. Please try again.`);
    if (data === null) return null;
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error(`${label} could not be read. Please try again.`);
    return Object.keys(data).length ? data : null;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`${label} took too long to load. Please try again.`);
    if (error instanceof TypeError) throw new Error(`${label} could not reach the health service. Check your connection and try again.`);
    throw error;
  } finally { clearTimeout(timer); }
}

// Render values as text, never pass API objects directly to React Native Text.
export function recordText(value, fallback = 'Not available') {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.map(item => recordText(item, '')).filter(Boolean).join('\n') || fallback;
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${labelFor(key)}: ${recordText(item)}`).join('\n') || fallback;
  }
  return String(value);
}

function labelFor(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export function withRecordKeys(records) {
  const occurrences = new Map();
  return records.map(record => {
    const base = JSON.stringify([record.id ?? null, record.file_path ?? null,
      record.file_name ?? null, record.upload_date ?? null, record.scan_date ?? null]);
    const occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1);
    return { ...record, recordKey: `${base}:${occurrence}` };
  });
}

export async function fetchFinalDiagnoses(userId) {
  const data = await requestJson(`${API_BASE_URL}/api/patient-final-diagnoses/${encodeURIComponent(userId)}`, { cache: 'no-store' });
  return withRecordKeys(requireArray(data).filter(record => record.ai_findings?.human_verified === true));
}

export function finalFindings(record) {
  // Only dentist-retained annotations. Never restore removed AI predictions.
  const annotations = record.ai_findings?.annotations;
  if (!Array.isArray(annotations)) return ['Final finding details are unavailable.'];
  if (!annotations.length) return ['No findings retained in the saved final diagnosis.'];
  return annotations.map(finding => typeof finding?.name === 'string' && finding.name.trim()
    ? finding.name : 'Unnamed saved finding');
}

export function clinicalNotes(record) {
  return typeof record.clinical_notes === 'string' && record.clinical_notes.trim()
    ? record.clinical_notes : 'No clinical notes were entered for this saved diagnosis.';
}

export function healthRows(analytics) {
  const rows = Object.entries(analytics || {}).filter(([, value]) =>
    ['string', 'number', 'boolean'].includes(typeof value)
  ).map(([key, value]) => [labelFor(key), recordText(value)]);
  return rows.length ? rows : [['Data', 'Not available']];
}

export function riskRows(risk) {
  return [
    ['Risk Score', recordText(risk?.risk_score ?? risk?.score)],
    ['Risk Grade', recordText(risk?.health_grade ?? risk?.risk_grade ?? risk?.grade)],
    ['Risk Level', recordText(risk?.risk_level ?? risk?.level)],
  ];
}

export function riskAnalysis(risk) {
  return [
    ['Disease Progression Forecast', recordText(risk?.disease_progression_forecast ?? risk?.forecast, 'No forecast available.')],
    ['Recommended Actions', recordText(risk?.recommended_action ?? risk?.recommended_actions ?? risk?.actions, 'No recommended actions available.')],
  ];
}

export async function fetchMedicalReport(userId) {
  // A failure must not silently produce a partial medical report.
  const [analytics, risk, diagnoses] = await Promise.all([
    fetchPatientHealth(userId, 'analytics'),
    fetchPatientHealth(userId, 'oral-health-risk'),
    fetchFinalDiagnoses(userId),
  ]);
  return { analytics, risk, diagnoses };
}

function escapeHtml(value) {
  return recordText(value, '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export function medicalReportHtml(patientName, data, date = new Date()) {
  const table = rows => `<table><tbody>${rows.map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>`;
  const diagnoses = data.diagnoses.filter(record => record.ai_findings?.human_verified === true);
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OraVista Medical Report</title><style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #172b36; font-size: 11pt; line-height: 1.5; }
    h1, h2, h3 { color: #007f8e; break-after: avoid; page-break-after: avoid; }
    h1 { font-size: 22pt; } h2 { font-size: 15pt; margin-top: 24px; } h3 { font-size: 12pt; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
    th, td { text-align: left; vertical-align: top; padding: 9px; border-bottom: 1px solid #dce5e7; }
    th { width: 35%; background: #eef7f7; }
    td, p, li { white-space: pre-wrap; overflow-wrap: anywhere; word-wrap: break-word; }
    li { margin-bottom: 8px; } .diagnosis { break-before: page; page-break-before: always; }
    .watermark { position: fixed; top: 45%; left: 5%; width: 90%; text-align: center;
      transform: rotate(-30deg); color: rgba(76,175,80,0.18); font-size: 32pt; font-weight: bold; }
    .personal { color: #52666b; font-size: 9pt; }
    </style></head><body><div class="watermark">FOR PERSONAL USE ONLY</div>
    <h1>OraVista Clinic</h1><p>Patient Report: ${escapeHtml(patientName)}</p>
    <p>Date: ${escapeHtml(displayDate(date))}</p>
    <p class="personal">FOR PERSONAL USE ONLY</p>
    <h2>Health Context &amp; Lifestyle</h2>${table(healthRows(data.analytics))}
    <h2>AI Assessment</h2>${table(riskRows(data.risk))}
    <h2>Analysis</h2>${riskAnalysis(data.risk).map(([label, value]) => `<h3>${escapeHtml(label)}</h3><p>${escapeHtml(value)}</p>`).join('')}
    ${diagnoses.length ? diagnoses.map(record => `<section class="diagnosis">
      <h2>Dentist-Saved Final Diagnosis${record.id != null ? ` #${escapeHtml(record.id)}` : ''}</h2>
      <p>Scan date: ${escapeHtml(displayDate(record.scan_date))}</p>
      <h3>Final Findings Saved by the Dentist</h3>
      <ul>${finalFindings(record).map(finding => `<li>${escapeHtml(finding)}</li>`).join('')}</ul>
      <h3>Dentist’s Clinical Notes</h3><p>${escapeHtml(clinicalNotes(record))}</p></section>`).join('')
      : '<h2>Dentist-Saved Final Diagnoses</h2><p>No dentist-saved final diagnoses are available yet.</p>'}
    </body></html>`;
}
