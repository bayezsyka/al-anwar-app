// app/wakaf/list.tsx
// List doa pada satu kategori

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { DoaItem, getDoaBySource } from "../../lib/api";

const PRIMARY_GREEN = "#008362";

function titleFromSource(source: string): string {
  const key = source.toLowerCase();
  if (key === "harian") return "Doa Harian";
  if (key === "ibadah") return "Doa Ibadah";
  if (key === "quran") return "Doa dari Al-Qur'an";
  if (key === "hadits") return "Doa dari Hadits";
  if (key === "pilihan") return "Doa Pilihan";
  if (key === "haji") return "Doa Haji & Umrah";
  if (key === "lainnya") return "Doa Lainnya";
  return "Doa";
}

export default function DoaListByCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; title?: string }>();

  const source = (params.source || "").toString();
  const headerTitle = params.title?.toString() || titleFromSource(source);

  const [list, setList] = useState<DoaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDoa = async () => {
    if (!source) {
      setError("Kategori doa tidak ditemukan.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getDoaBySource(source);
      setList(data);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat doa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoa();
  }, [source]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) => {
      const judul = d.judul?.toLowerCase() || "";
      const indo = d.indo?.toLowerCase() || "";
      const arab = d.arab || "";
      return judul.includes(q) || indo.includes(q) || arab.includes(q);
    });
  }, [list, searchQuery]);

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9ca3af"
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder="Cari doa..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {loading && list.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={PRIMARY_GREEN} />
            <Text style={styles.mutedText}>Memuat doa...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>Doa tidak ditemukan.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(_, idx) => idx.toString()}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item, index }) => {
              // index di sini index di filtered, kita cari index asli di list
              const realIndex = list.indexOf(item);
              const displayIndex = realIndex + 1;
              return (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/doa/detail",
                      params: {
                        source,
                        index: String(realIndex),
                      },
                    })
                  }
                  style={styles.row}
                >
                  <Text style={styles.rowIndex}>{displayIndex}</Text>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.judul}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={18}
                    color="#9ca3af"
                  />
                </Pressable>
              );
            }}
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
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  rowIndex: {
    width: 24,
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  rowContent: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 14,
    color: "#111827",
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
});
