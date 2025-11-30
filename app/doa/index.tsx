// app/wakaf/index.tsx
// Halaman kategori doa

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDoaBySource } from "../../lib/api";

const PRIMARY_GREEN = "#008362";

type DoaCategory = {
  key: string;
  title: string;
  count: number;
};

const SOURCE_DEFS: { key: string; title: string }[] = [
  { key: "harian", title: "Doa Harian" },
  { key: "ibadah", title: "Doa Ibadah" },
  { key: "quran", title: "Doa dari Al-Qur'an" },
  { key: "hadits", title: "Doa dari Hadits" },
  { key: "pilihan", title: "Doa Pilihan" },
  { key: "haji", title: "Doa Haji & Umrah" },
  { key: "lainnya", title: "Doa Lainnya" },
];

export default function DoaCategoryScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<DoaCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await Promise.all(
        SOURCE_DEFS.map(async (def) => {
          const list = await getDoaBySource(def.key);
          return {
            key: def.key,
            title: def.title,
            count: list.length,
          } as DoaCategory;
        })
      );

      setCategories(result);
    } catch (e: any) {
      setError(e?.message || "Gagal mengambil kategori doa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.title.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header hijau */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Doa</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        {/* Search kategori */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9ca3af"
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder="Cari kategori doa..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {loading && categories.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={PRIMARY_GREEN} />
            <Text style={styles.mutedText}>Memuat kategori doa...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadCounts}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/doa/list",
                    params: {
                      source: item.key,
                      title: item.title,
                    },
                  })
                }
                style={styles.card}
              >
                <View style={styles.indexBox}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.count} Bacaan</Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color="#9ca3af"
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  header: {
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },

  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  segmentBackground: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  segmentInactive: {},
  segmentInactiveText: {
    color: "#6b7280",
  },
  segmentActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentActiveText: {
    color: PRIMARY_GREEN,
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 4,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  indexBox: {
    width: 32,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  indexText: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  mutedText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PRIMARY_GREEN,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
});
