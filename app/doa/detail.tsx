// app/wakaf/detail.tsx
// Detail doa dalam satu kategori + prev/next

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function DoaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; index?: string }>();

  const source = (params.source || "").toString();
  const initialIndex = Number(params.index ?? "0");

  const [list, setList] = useState<DoaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!source) {
      setError("Kategori doa tidak ditemukan.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getDoaBySource(source);
      setList(data);
      const maxIndex = Math.max(0, data.length - 1);
      const idx = Math.min(Math.max(0, initialIndex), maxIndex);
      setCurrentIndex(idx);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat doa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [source, initialIndex]);

  const current = list[currentIndex];
  const total = list.length;
  const counter = total > 0 ? `${currentIndex + 1}/${total}` : "";

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

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
          {titleFromSource(source)}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading && !current ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY_GREEN} />
          <Text style={styles.mutedText}>Memuat doa...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{error}</Text>
        </View>
      ) : !current ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Doa tidak ditemukan.</Text>
        </View>
      ) : (
        <>
          {/* bar judul + prev/next */}
          <View style={styles.navHeader}>
            <Pressable
              onPress={handlePrev}
              disabled={currentIndex === 0}
              style={[
                styles.navArrow,
                currentIndex === 0 && styles.navArrowDisabled,
              ]}
            >
              <Ionicons
                name="chevron-back-outline"
                size={18}
                color={currentIndex === 0 ? "#9ca3af" : PRIMARY_GREEN}
              />
            </Pressable>

            <View style={styles.navCenter}>
              {counter ? (
                <Text style={styles.counterText}>{counter}</Text>
              ) : null}
              <Text
                style={styles.navTitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {current.judul}
              </Text>
            </View>

            <Pressable
              onPress={handleNext}
              disabled={currentIndex === total - 1}
              style={[
                styles.navArrow,
                currentIndex === total - 1 && styles.navArrowDisabled,
              ]}
            >
              <Ionicons
                name="chevron-forward-outline"
                size={18}
                color={currentIndex === total - 1 ? "#9ca3af" : PRIMARY_GREEN}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.arabText}>{current.arab}</Text>

            <Text style={styles.translationLabel}>Artinya:</Text>
            <Text style={styles.translationText}>{current.indo}</Text>
          </ScrollView>
        </>
      )}
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

  navHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
  },
  navArrowDisabled: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  counterText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  arabText: {
    fontSize: 26,
    lineHeight: 40,
    textAlign: "right",
    color: "#0f172a",
    marginBottom: 18,
  },
  translationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#111827",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mutedText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
});
