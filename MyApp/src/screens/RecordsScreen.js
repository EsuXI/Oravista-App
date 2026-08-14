import React, { useState, useCallback, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
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
import { API_BASE_URL } from '../config/config';

const CATEGORIES = ["All", "Treatment Record", "Dental Checkup", "X-Ray"];
const ITEMS_PER_PAGE = 4;

export default function RecordsScreen() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem("userEmail");
      const userRes = await fetch(`${API_BASE_URL}/api/user-profile?email=${email}`);
      const userData = await userRes.json();

      if (userRes.ok && userData.id) {
        const response = await fetch(`${API_BASE_URL}/api/patient-records/${userData.id}`);
        const data = await response.json();
        if (response.ok) setRecords(data);
      }
    } catch (error) {
      console.error("Failed to fetch records", error);
    } finally {
      setLoading(false);
    }
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
    const nameLower = rec.file_name.toLowerCase();
    const formattedDate = new Date(rec.upload_date).toLocaleDateString();
    const branchName = rec.clinic_branch ? rec.clinic_branch.toLowerCase() : "";
    const doctorName = rec.dentist_name ? rec.dentist_name.toLowerCase() : "";

    const matchesSearch = 
      nameLower.includes(searchLower) || 
      rec.id.toString().includes(searchLower) ||
      formattedDate.includes(searchLower) ||
      branchName.includes(searchLower) ||
      doctorName.includes(searchLower);
    
    let matchesCategory = true;
    if (activeCategory === "X-Ray") matchesCategory = nameLower.includes("xray") || nameLower.includes("x-ray");
    else if (activeCategory === "Dental Checkup") matchesCategory = nameLower.includes("checkup") || nameLower.includes("clean");
    else if (activeCategory === "Treatment Record") matchesCategory = !nameLower.includes("x-ray") && !nameLower.includes("checkup");

    return matchesSearch && matchesCategory;
  });

  const displayedData = filteredRecords.slice(0, page * ITEMS_PER_PAGE);

  const loadMoreData = () => {
    if (displayedData.length < filteredRecords.length) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const handleDownload = (filePath) => {
    if (!filePath) {
      Alert.alert("Not Available", "No document has been attached to this record yet.");
      return;
    }
    
    const fileUrl = filePath.startsWith('http') ? filePath : `${API_BASE_URL}/${filePath}`;
    
    Linking.openURL(fileUrl).catch(() => {
      Alert.alert("Error", "Could not open document. Check your connection.");
    });
  };

  const renderItem = ({ item }) => {
    const displayAddress = item.clinic_branch || "Main Branch - 2015 Gil puyat, Pasay City";
    const displayDoctor = item.dentist_name || "Auto-assigned";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBox}>
            <Text style={styles.type}>Medical Record</Text>
            <Text style={styles.recordId}> • REC-{item.id.toString().padStart(3, '0')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.downloadBtn}
            onPress={() => handleDownload(item.file_path)}
          >
            <Ionicons name="download-outline" size={18} color="#001166" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{item.file_name}</Text>
        
        <View style={{ marginTop: 12, marginBottom: 14 }}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>{displayDoctor}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>{displayAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>Uploaded on: {new Date(item.upload_date).toLocaleDateString()}</Text>
          </View>
        </View>
        
        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={14} color="#001166" style={{marginRight: 6}} />
          <Text style={styles.noteText}>
            This is a secure medical document. Tap the download icon to view details or images.
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (displayedData.length >= filteredRecords.length) return null;
    
    return (
      <TouchableOpacity 
        style={styles.loadMoreBtn} 
        onPress={loadMoreData}
        activeOpacity={0.7}
      >
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Medical Records" />

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search date, clinic, file name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
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
          <ActivityIndicator size="large" color="#001166" />
        </View>
      ) : (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 14, color: "#111827" },
  filterContainer: { paddingVertical: 12, maxHeight: 60 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", justifyContent: "center" },
  activeFilterChip: { backgroundColor: "#001166", borderColor: "#001166" },
  filterText: { fontFamily: fonts.medium, fontSize: 13, color: "#6B7280" },
  activeFilterText: { color: "#FFFFFF" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { fontSize: 14, color: "#9CA3AF", fontFamily: fonts.medium },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB", elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBox: { flexDirection: "row", alignItems: "center" },
  type: { fontSize: 11, fontFamily: fonts.bold, color: "#6B7280", textTransform: 'uppercase' },
  recordId: { fontSize: 11, fontFamily: fonts.medium, color: "#9CA3AF" },
  downloadBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#F0F4FF", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: fonts.bold, color: "#111827" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  infoText: { fontSize: 13, color: "#4B5563", fontFamily: fonts.medium, flexShrink: 1 },
  noteBox: { flexDirection: 'row', backgroundColor: "#F9FAFB", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  noteText: { flex: 1, fontSize: 11, fontFamily: fonts.regular, color: "#4B5563", lineHeight: 16 },
  loadMoreBtn: { paddingVertical: 14, backgroundColor: "#F3F4F6", borderRadius: 14, alignItems: "center", marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  loadMoreText: { color: "#001166", fontFamily: fonts.semiBold, fontSize: 14 },
});