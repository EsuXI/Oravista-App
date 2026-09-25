// Keep network failures distinct from successful empty results.
export async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      const message = typeof data?.message === 'string' ? data.message : `Request failed (${response.status}). Please try again.`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    if (data === null || typeof data !== 'object') throw new Error('The server returned an unreadable response. Please try again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

export function requireArray(data, key) {
  const list = Array.isArray(data) ? data : data?.[key];
  if (!Array.isArray(list) || list.some(item => !item || typeof item !== 'object')) {
    throw new Error('The server returned an unexpected list. Please try again.');
  }
  return list;
}

export function fileUrl(value, baseUrl) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const path = value.trim();
  if (/^https?:\/\/[^/\s]+(?:\/|$)/i.test(path)) return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//') || /[\\\s<>]/.test(path)) return null;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function clinicDate(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dateKey(value) {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

export function validBirthDate(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= clinicDate(now);
}

export function displayDate(value) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not provided' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

export function timeMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]), suffix = match[3]?.toUpperCase();
  if (minute > 59 || (suffix ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (suffix) hour = hour % 12 + (suffix === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

export function nextAppointment(appointments, now = new Date()) {
  const day = clinicDate(now);
  const clinicNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const minute = clinicNow.getUTCHours() * 60 + clinicNow.getUTCMinutes();
  return appointments.filter(a => {
    const date = dateKey(a.appointment_date), time = timeMinutes(a.appointment_time);
    return ['pending', 'approved', 'confirmed'].includes(String(a.status || '').trim().toLowerCase()) &&
      (date > day || (date === day && (time === null || time >= minute)));
  }).sort((a, b) => dateKey(a.appointment_date).localeCompare(dateKey(b.appointment_date)) ||
    (timeMinutes(a.appointment_time) ?? 1440) - (timeMinutes(b.appointment_time) ?? 1440))[0] || null;
}

export function money(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Not available';
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function loadBillings(baseUrl, userId) {
  try {
    const data = await requestJson(`${baseUrl}/api/user-billings/${encodeURIComponent(userId)}`);
    const records = requireArray(data, 'records');
    return { records, totalOutstanding: data.totalOutstanding ?? null };
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  // The web server exposes billing fields on appointment records instead.
  const data = await requestJson(`${baseUrl}/api/user-appointments/${encodeURIComponent(userId)}`);
  const records = requireArray(data, 'appointments').map(record => ({
    id: record.id, title: record.service_type,
    amount: record.amount ?? record.base_price ?? null,
    status: record.billing_status || 'Not provided',
    date: displayDate(record.appointment_date),
    invoice_path: typeof record.receipt_details === 'string' ? record.receipt_details : null,
  }));
  const incomplete = records.some(r => r.status === 'Not provided' || r.amount === null || !Number.isFinite(Number(r.amount)));
  return { records, totalOutstanding: incomplete ? null : records.filter(r => r.status.toLowerCase() === 'pending').reduce((sum, r) => sum + Number(r.amount), 0) };
}
