import { requestJson, requireArray, fileUrl, displayDate } from '../utils/patientData';
import LoadError from '../components/LoadError';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  FlatList
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../theme/fonts";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import CustomAlertModal from "../components/CustomAlertModal";
import { API_BASE_URL } from "../config/config";

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  withRecordKeys, fetchPatientHealth, fetchFinalDiagnoses, finalFindings,
  clinicalNotes, healthRows, riskRows, riskAnalysis, recordText,
  fetchMedicalReport, medicalReportHtml,
} from '../utils/patientRecords';

const CATEGORIES = ["All", "PDF", "Images", "Other files"];
const ITEMS_PER_PAGE = 10;

export default function RecordsScreen() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const listRef = useRef(null);
  const [expandedId, setExpandedId] = useState(null);

  const [patient, setPatient] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [risk, setRisk] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const requestVersion = useRef(0);
  const reportBusy = useRef(false);
  const [diagnosisPage, setDiagnosisPage] = useState(1);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  const fetchRecords = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    setSectionErrors({});
    setPatient(null);
    setRecords([]);
    setDiagnoses([]);
    setAnalytics(null);
    setRisk(null);
    setPage(1);
    setDiagnosisPage(1);
    try {
      const stored = await AsyncStorage.getItem('userData');
      let user = stored ? JSON.parse(stored) : null;
      let id = user?.id || user?.user_id;
      if (!id) {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) {
          user = await requestJson(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
          id = user.id;
        }
      }
      if (!id) throw new Error('Could not identify your account. Please log in again.');
      const results = await Promise.allSettled([
        requestJson(`${API_BASE_URL}/api/patient-records/${encodeURIComponent(id)}`)
          .then(data => withRecordKeys(requireArray(data))),
        fetchPatientHealth(id, 'analytics'),
        fetchPatientHealth(id, 'oral-health-risk'),
        fetchFinalDiagnoses(id),
      ]);
      if (version !== requestVersion.current) return;
      setPatient({ ...user, id });
      const errors = {};
      const setters = [setRecords, setAnalytics, setRisk, setDiagnoses];
      const keys = ['attachments', 'analytics', 'risk', 'diagnoses'];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') setters[index](result.value);
        else errors[keys[index]] = result.reason?.message || 'Unable to load this section. Please try again.';
      });
      setSectionErrors(errors);
    } catch (error) {
      if (version === requestVersion.current) setLoadError(error.message || 'Unable to load your records. Please try again.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchRecords();
    return () => { requestVersion.current++; };
  }, [fetchRecords]));

  const handleGenerateReport = async () => {
    if (!patient?.id || reportBusy.current) return;
    reportBusy.current = true;
    setGeneratingReport(true);
    const version = requestVersion.current;
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Saving or sharing PDFs is not available on this device.');
      const data = await fetchMedicalReport(patient.id);
      if (version !== requestVersion.current) return;
      const patientName = [patient.firstName || patient.first_name, patient.lastName || patient.last_name]
        .filter(value => typeof value === 'string' && value.trim()).join(' ') || 'Patient';
      const { uri } = await Print.printToFileAsync({
        html: medicalReportHtml(patientName, data), width: 595, height: 842,
      });
      if (version !== requestVersion.current) return;
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: 'Save or share your OraVista medical report' });
    } catch (error) {
      if (version === requestVersion.current) setAlertConfig({
        visible: true, type: 'error', title: 'Could Not Generate Report',
        message: error.message || 'Please try again.',
        onPrimaryPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      reportBusy.current = false;
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setDiagnosisPage(1);
  }, [searchQuery, activeCategory]);

  const filteredRecords = records.filter((rec) => {
    const searchLower = searchQuery.toLowerCase();
    const nameLower = recordText(rec.file_name, "").toLowerCase();
    const formattedDate = displayDate(rec.upload_date);
    const branchName = recordText(rec.clinic_branch, "").toLowerCase();
    const doctorName = recordText(rec.dentist_name, "").toLowerCase();

    const matchesSearch =
      nameLower.includes(searchLower) ||
      (rec.id || "").toString().includes(searchLower) ||
      formattedDate.toLowerCase().includes(searchLower) ||
      branchName.includes(searchLower) ||
      doctorName.includes(searchLower);

    // File format is observable; a filename does not establish a clinical diagnosis/type.
    const isPdf = /\.pdf$/i.test(rec.file_name || '');
    const isImage = /\.(png|jpe?g|webp|gif|heic)$/i.test(rec.file_name || '');
    const format = isPdf ? 'PDF' : isImage ? 'Images' : 'Other files';
    const matchesCategory = activeCategory === 'All' || activeCategory === format;

    return matchesSearch && matchesCategory;
  });

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const displayedData = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const changePage = (next) => { setPage(next); setExpandedId(null); listRef.current?.scrollToOffset({offset:0, animated:false}); };

  const loadMoreData = () => {
    if (displayedData.length < filteredRecords.length) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleDownload = (filePath) => {
    const url = fileUrl(filePath, API_BASE_URL);
    if (!url) {
      setAlertConfig({
        visible: true,
        type: "info",
        title: "File Not Found",
        message: "No document has been attached to this record yet.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    Linking.openURL(url).catch(() => {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Cannot Open File",
        message: "Could not open document. Please check your internet connection.",
        onPrimaryPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    });
  };

  const renderItem = ({ item }) => {
    const displayAddress = recordText(item.clinic_branch, "Branch not provided");
    const displayDoctor = recordText(item.dentist_name, "Dentist not provided");

    return (
      <View style={styles.card}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:expandedId === item.id}} onPress={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{flex:1,minHeight:48,justifyContent:'center'}}>
            <Text style={styles.title} numberOfLines={1}>{recordText(item.file_name, 'Medical record')}</Text>
            <Text style={styles.infoText}>{displayDate(item.upload_date)} · REC-{recordText(item.id)}</Text>
            <Text style={styles.infoText} numberOfLines={1}>{displayDoctor}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${item.file_name || 'medical record'}`} style={styles.downloadBtn} onPress={() => handleDownload(item.file_path)}><Ionicons name="download-outline" size={18} color={colors.accent}/></TouchableOpacity>
        </View>
        {expandedId === item.id && <Text style={styles.infoText}>{recordText(item.file_name)} · {displayAddress}</Text>}
      </View>
    );
  };

  const visibleDiagnoses = diagnoses.filter(record =>
    [record.id, displayDate(record.scan_date), clinicalNotes(record), ...finalFindings(record)]
      .join(' ').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const renderRows = rows => rows.map(([label, value]) => (
    <View key={label} style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultText}>{value}</Text>
    </View>
  ));

  const renderSectionError = key => (
    <LoadError message={sectionErrors[key]} onRetry={fetchRecords} />
  );

  const reportHeader = (
    <View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Generate medical report PDF"
        accessibilityState={{ disabled: generatingReport || !patient?.id }}
        disabled={generatingReport || !patient?.id} onPress={handleGenerateReport}
        style={[styles.reportButton, generatingReport && styles.disabledButton]}>
        {generatingReport ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="document-text-outline" size={20} color={colors.accent} />}
        <Text style={styles.loadMoreText}>{generatingReport ? 'Generating Report…' : 'Generate Medical Report PDF'}</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.title}>Health Context &amp; Lifestyle</Text>
        {sectionErrors.analytics ? renderSectionError('analytics') : renderRows(healthRows(analytics))}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>AI Assessment</Text>
        {sectionErrors.risk ? renderSectionError('risk') : <>
          {renderRows(riskRows(risk))}
          {renderRows(riskAnalysis(risk))}
        </>}
      </View>
      <Text style={styles.sectionTitle}>Dentist-Saved Final Diagnoses</Text>
      {sectionErrors.diagnoses ? renderSectionError('diagnoses') : <>
        {!visibleDiagnoses.length && <Text style={styles.sectionEmpty}>{diagnoses.length ? 'No matching final diagnoses.' : 'No dentist-saved final diagnoses are available yet.'}</Text>}
        {visibleDiagnoses.slice(0, diagnosisPage * ITEMS_PER_PAGE).map(record => (
          <View key={record.recordKey} style={styles.card}>
            <Text style={styles.title}>Final Diagnosis{record.id != null ? ` #${recordText(record.id)}` : ''}</Text>
            <Text style={styles.resultText}>Scan date: {displayDate(record.scan_date)}</Text>
            <Text style={styles.resultLabel}>Final Findings Saved by the Dentist</Text>
            {finalFindings(record).map((finding, index) => <Text key={index} style={styles.finding}>• {finding}</Text>)}
            <Text style={styles.resultLabel}>Dentist’s Clinical Notes</Text>
            <Text style={styles.resultText}>{clinicalNotes(record)}</Text>
          </View>
        ))}
        {visibleDiagnoses.length > diagnosisPage * ITEMS_PER_PAGE && (
          <TouchableOpacity accessibilityRole="button" style={styles.loadMoreBtn} onPress={() => setDiagnosisPage(value => value + 1)}>
            <Text style={styles.loadMoreText}>Load More Diagnoses</Text>
          </TouchableOpacity>
        )}
      </>}
      <Text style={styles.sectionTitle}>Attached Files</Text>
      {sectionErrors.attachments ? renderSectionError('attachments') : null}
    </View>
  );

  const renderFooter = () => filteredRecords.length === 0 ? null : (
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:4,gap:8}}>
      <TouchableOpacity accessibilityRole="button" disabled={currentPage === 1} onPress={() => changePage(currentPage - 1)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,opacity:currentPage === 1 ? 0.4 : 1}}><Text style={{color:colors.accent}}>Previous</Text></TouchableOpacity>
      <Text style={{color:colors.muted,fontSize:12}}>{currentPage} / {pageCount}</Text>
      <TouchableOpacity accessibilityRole="button" disabled={currentPage === pageCount} onPress={() => changePage(currentPage + 1)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,opacity:currentPage === pageCount ? 0.4 : 1}}><Text style={{color:colors.accent}}>Next</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScreenHeader title="Medical Records" />

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput accessibilityLabel="Search date, clinic, file name..."
          style={styles.searchInput}
          placeholder="Search date, clinic, file name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView keyboardShouldPersistTaps="handled" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity accessibilityRole="button"
              key={category}
              style={[styles.filterChip, activeCategory === category && styles.activeFilterChip]}
              onPress={() => setActiveCategory(category)}
            >
              <Text style={[styles.filterText, activeCategory === category && styles.activeFilterText]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View testID="top-pagination" style={{paddingHorizontal:16}}>{renderFooter()}</View>
      {loading && page === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : loadError ? (<LoadError message={loadError} onRetry={fetchRecords} />) : (
        <FlatList
          style={{flex:1}}
          ref={listRef}
          data={displayedData}
          keyExtractor={(item) => item.recordKey}
          ListHeaderComponent={reportHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          ListEmptyComponent={sectionErrors.attachments ? null :
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No attached files found.</Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={alertConfig.onPrimaryPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 20, marginBottom: 16, backgroundColor: colors.aquaSoft, borderWidth: 1, borderColor: colors.border },
  disabledButton: { opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, marginBottom: 14 },
  sectionEmpty: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted, marginBottom: 20, lineHeight: 21 },
  resultRow: { marginTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.ink, marginTop: 10, marginBottom: 6 },
  resultText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 22 },
  finding: { fontFamily: fonts.regular, fontSize: 13, color: colors.ink, lineHeight: 22, marginBottom: 6 },
  container: { flex: 1, backgroundColor: colors.canvas },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, height: 48, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filterContainer: { paddingVertical: 6 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, minHeight:44, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center" },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.accent },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  activeFilterText: { color: colors.ink },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: colors.muted, fontFamily: fonts.medium },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 0, padding: 10, marginBottom: 0, borderWidth: 1, borderColor: colors.border, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBox: { flexDirection: "row", alignItems: "center" },
  type: { fontSize: 11, fontFamily: fonts.bold, color: colors.muted, textTransform: "uppercase" },
  recordId: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted },
  downloadBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.ink },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium, flexShrink: 1 },
  noteBox: { flexDirection: "row", backgroundColor: colors.input, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  noteText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.muted, lineHeight: 16 },
  loadMoreBtn: { paddingVertical: 14, backgroundColor: colors.aquaSoft, borderRadius: 14, alignItems: "center", marginTop: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  loadMoreText: { color: colors.accent, fontFamily: fonts.semiBold, fontSize: 14 },
});