import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { retainMedicalReport } from './reportFile';
import { fetchMedicalReport, medicalReportHtml } from './patientRecords';

// A native print request can stop responding under device storage pressure.
// Only the winning operation may continue to saving/sharing; late results stay unused.
export async function withDeadline(operation, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function generateMedicalReport(patient, services = {}) {
  const available = services.available || Sharing.isAvailableAsync;
  const fetchData = services.fetchData || fetchMedicalReport;
  const print = services.print || Print.printToFileAsync;
  const retain = services.retain || retainMedicalReport;
  const deadline = services.deadline || withDeadline;
  if (!(await deadline(available, 5000, 'PDF sharing did not respond. Please try again.'))) {
    throw new Error('Saving or sharing PDFs is not available on this device.');
  }
  const data = await deadline(() => fetchData(patient.id), 65000,
    'The health service took too long. Check your connection and try again.');
  const name = [patient.firstName || patient.first_name, patient.lastName || patient.last_name]
    .filter(value => typeof value === 'string' && value.trim()).join(' ') || 'Patient';
  const { uri } = await deadline(() => print({
    html: medicalReportHtml(name, data, new Date(), patient), width: 595, height: 842,
  }), 30000, 'Generating the PDF took too long. Free some device storage, then try again.');
  return deadline(() => retain(uri, patient.id), 10000,
    'Saving the PDF took too long. Free some device storage, then try again.');
}
