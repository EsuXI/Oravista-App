import * as FileSystem from 'expo-file-system/legacy';

// External viewers can outlive the share sheet. Retain the PDF outside temporary
// print cache and validate it before Android hands its URI to another app.
export async function retainMedicalReport(sourceUri, patientId, stamp = Date.now()) {
  if (!FileSystem.documentDirectory || !sourceUri?.startsWith('file://')) {
    throw new Error('The generated PDF could not be saved. Please try again.');
  }
  const source = await FileSystem.getInfoAsync(sourceUri);
  if (!source.exists || source.isDirectory || !source.size) {
    throw new Error('The generated PDF is missing or empty. Please try again.');
  }
  const directory = `${FileSystem.documentDirectory}medical-reports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const id = String(patientId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const destination = `${directory}King_Epres_Patient_Report_${id}_${stamp}.pdf`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  const saved = await FileSystem.getInfoAsync(destination);
  if (!saved.exists || saved.isDirectory || saved.size !== source.size) {
    throw new Error('The PDF could not be saved completely. Please try again.');
  }
  return destination;
}
