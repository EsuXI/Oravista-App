import { requestJson, requireArray, fileUrl, displayDate } from '../utils/patientData';
import LoadError from '../components/LoadError';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme/colors';
import React, { useState, useCallback, useEffect } from "react";
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

const CATEGORIES = ["All", "PDF", "Images", "Other files"];
const ITEMS_PER_PAGE = 4;

export default function RecordsScreen() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);

  // Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onPrimaryPress: () => {},
  });

  const fetchRecords = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const stored = await AsyncStorage.getItem('userData');
      const user = stored ? JSON.parse(stored) : null;
      let id = user?.id || user?.user_id;
      if (!id) {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) id = (await requestJson(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`)).id;
      }
      if (!id) throw new Error('Could not identify your account. Please log in again.');
      const data = await requestJson(`${API_BASE_URL}/api/patient-records/${encodeURIComponent(id)}`);
      setRecords(requireArray(data, undefined));
    } catch (error) {
      setLoadError(error.message || 'Unable to load your records. Please try again.');
    } finally { setLoading(false); }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [])
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategory]);

  const filteredRecords = records.filter((rec) => {
    const searchLower = searchQuery.toLowerCase();
    const nameLower = (rec.file_name || "").toLowerCase();
    const formattedDate = displayDate(rec.upload_date);
    const branchName = (rec.clinic_branch || "").toLowerCase();
    const doctorName = (rec.dentist_name || "").toLowerCase();

    const matchesSearch =
      nameLower.includes(searchLower) ||
      (rec.id || "").toString().includes(searchLower) ||
      formattedDate.includes(searchLower) ||
      branchName.includes(searchLower) ||
      doctorName.includes(searchLower);

    // File format is observable; a filename does not establish a clinical diagnosis/type.
    const isPdf = /\.pdf$/i.test(rec.file_name || '');
    const isImage = /\.(png|jpe?g|webp|gif|heic)$/i.test(rec.file_name || '');
    const format = isPdf ? 'PDF' : isImage ? 'Images' : 'Other files';
    const matchesCategory = activeCategory === 'All' || activeCategory === format;

    return matchesSearch && matchesCategory;
  });

  const displayedData = filteredRecords.slice(0, page * ITEMS_PER_PAGE);

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
    const displayAddress = item.clinic_branch || "Branch not provided";
    const displayDoctor = item.dentist_name || "Dentist not provided";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBox}>
            <Text style={styles.type}>Medical Record</Text>
            <Text style={styles.recordId}> • REC-{(item.id || 0).toString().padStart(3, "0")}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Download document" hitSlop={8} accessibilityRole="button"
            style={styles.downloadBtn}
            onPress={() => handleDownload(item.file_path)}
          >
            <Ionicons name="download-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{item.file_name || "Diagnostic File"}</Text>

        <View style={{ marginTop: 12, marginBottom: 14 }}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={colors.muted} />
            <Text style={styles.infoText}>{displayDoctor}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{displayAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.infoText}>Uploaded: {displayDate(item.upload_date)}</Text>
          </View>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={14} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.noteText}>
            Tap the download icon above to preview or save this record.
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (displayedData.length >= filteredRecords.length) return null;
    return (
      <TouchableOpacity accessibilityRole="button" style={styles.loadMoreBtn} onPress={loadMoreData} activeOpacity={0.7}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

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

      {loading && page === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : loadError ? (<LoadError message={loadError} onRetry={fetchRecords} />) : (
        <FlatList
          data={displayedData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No medical records found.</Text>
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
  container: { flex: 1, backgroundColor: colors.canvas },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, height: 48, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filterContainer: { paddingVertical: 12, maxHeight: 60 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center" },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.accent },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  activeFilterText: { color: colors.ink },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: colors.muted, fontFamily: fonts.medium },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBox: { flexDirection: "row", alignItems: "center" },
  type: { fontSize: 11, fontFamily: fonts.bold, color: colors.muted, textTransform: "uppercase" },
  recordId: { fontSize: 11, fontFamily: fonts.medium, color: colors.muted },
  downloadBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium, flexShrink: 1 },
  noteBox: { flexDirection: "row", backgroundColor: colors.input, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  noteText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: colors.muted, lineHeight: 16 },
  loadMoreBtn: { paddingVertical: 14, backgroundColor: colors.aquaSoft, borderRadius: 999, alignItems: "center", marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  loadMoreText: { color: colors.accent, fontFamily: fonts.semiBold, fontSize: 14 },
});