// app/rutinan.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRutinanSchedule, Rutinan } from "../lib/api";

const PRIMARY_GREEN = "#008362";

// urutan: Senin (1) .. Ahad (7) – mengikuti day_of_week di backend (Carbon isoWeekday)
const HARI_INDONESIA = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Ahad",
];

function getHariFromDayOfWeek(dayOfWeek: number | null | undefined): string {
  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) return "";
  return HARI_INDONESIA[dayOfWeek - 1];
}

// JS getDay: 0 = Minggu, 1 = Senin, ... -> iso 1–7 (Senin–Ahad)
function getTodayIsoDow(d: Date): number {
  const js = d.getDay(); // 0..6
  return ((js + 6) % 7) + 1;
}

function formatTime(waktu?: string | null): string {
  if (!waktu) return "";
  const hhmm = waktu.slice(0, 5);
  return `${hhmm} WIB`;
}

const DAY_NAMES_FULL = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const MONTH_NAMES_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatFullDate(d: Date): string {
  const dayName = DAY_NAMES_FULL[d.getDay()];
  const date = String(d.getDate()).padStart(2, "0");
  const monthName = MONTH_NAMES_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
}

function formatClock(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// tanggal terdekat untuk day_of_week (1–7) dari base
function getNextOccurrence(dayOfWeek: number, base: Date): Date {
  const todayIso = getTodayIsoDow(base); // 1..7
  let diff = dayOfWeek - todayIso;
  if (diff < 0) diff += 7;
  const result = new Date(base);
  result.setHours(0, 0, 0, 0);
  result.setDate(base.getDate() + diff);
  return result;
}

type RutinanWithNext = Rutinan & { _nextDate: Date };

export default function RutinanScreen() {
  const router = useRouter();

  const [items, setItems] = useState<RutinanWithNext[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getRutinanSchedule();
      const today = new Date();

      const processed: RutinanWithNext[] = data
        .map((r) => ({
          ...r,
          _nextDate: getNextOccurrence(r.day_of_week, today),
        }))
        .sort((a, b) => a._nextDate.getTime() - b._nextDate.getTime());

      setItems(processed);
    } catch (e: any) {
      console.log("Error getRutinanSchedule:", e?.message);
      setError(e?.message || "Gagal memuat jadwal rutinan.");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // realtime clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const todayIsoDow = getTodayIsoDow(today);
  const todayYmd = toYMD(today);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header custom: back + title tengah */}
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.screenTitle}>Jadwal Rutinan</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Realtime waktu */}
        <View style={styles.realtimeBox}>
          <Text style={styles.dateText}>{formatFullDate(now)}</Text>
          <Text style={styles.timeText}>{formatClock(now)}</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading awal */}
        {!initialLoaded && loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Memuat jadwal rutinan...</Text>
          </View>
        ) : null}

        {/* Kosong */}
        {initialLoaded && !loading && items.length === 0 && !error && (
          <View style={styles.center}>
            <Text>Belum ada jadwal rutinan.</Text>
          </View>
        )}

        {/* Timeline */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          const hari = getHariFromDayOfWeek(item.day_of_week);
          const waktu = formatTime(item.waktu);
          const tempat = item.tempat || "";
          const pengisi = item.pengisi || "";
          const tanggalDisplay = formatDateDisplay(item._nextDate);

          const isToday = item.day_of_week === todayIsoDow;

          // libur: hanya exception yg tanggalnya belum lewat
          const futureExceptions = (item.exceptions || []).filter(
            (ex) => ex.libur_date >= todayYmd
          );
          const nextException = futureExceptions[0] ?? null;

          return (
            <View key={item.id} style={styles.timelineRow}>
              {/* Kolom garis timeline */}
              <View style={styles.timelineColumn}>
                <View
                  style={[
                    styles.timelineDotOuter,
                    isToday && styles.timelineDotOuterToday,
                  ]}
                >
                  <View
                    style={[
                      styles.timelineDotInner,
                      isToday && styles.timelineDotInnerToday,
                    ]}
                  />
                </View>
                {!isLast && <View style={styles.timelineLine} />}
              </View>

              {/* Card */}
              <View style={[styles.card, isToday && styles.cardToday]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    {hari ? (
                      <Text
                        style={[styles.dayText, isToday && styles.dayTextToday]}
                      >
                        {hari}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.titleText,
                        isToday && styles.titleTextToday,
                      ]}
                    >
                      {item.nama_acara}
                    </Text>
                    {pengisi ? (
                      <Text
                        style={[
                          styles.speakerText,
                          isToday && styles.speakerTextToday,
                        ]}
                      >
                        {pengisi}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.chipColumn}>
                    <View style={[styles.chip, isToday && styles.chipToday]}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={isToday ? "#E6F7F1" : PRIMARY_GREEN}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          isToday && styles.chipTextToday,
                        ]}
                      >
                        {tanggalDisplay}
                      </Text>
                    </View>

                    {waktu ? (
                      <View
                        style={[
                          styles.chip,
                          styles.chipSmallMargin,
                          isToday && styles.chipToday,
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={isToday ? "#E6F7F1" : PRIMARY_GREEN}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            isToday && styles.chipTextToday,
                          ]}
                        >
                          {waktu}
                        </Text>
                      </View>
                    ) : null}

                    {nextException && (
                      <View style={[styles.chip, styles.chipHoliday]}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={14}
                          color="#b91c1c"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.chipHolidayText}>
                          Libur {nextException.libur_date}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {tempat ? (
                  <View style={styles.row}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={isToday ? "#E6F7F1" : "#6b7280"}
                      style={styles.rowIcon}
                    />
                    <Text
                      style={[styles.rowText, isToday && styles.rowTextToday]}
                    >
                      {tempat}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}

        {loading && initialLoaded ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },

  // header custom
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  // realtime
  realtimeBox: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#E6F7F1",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_GREEN,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#111827",
  },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  timelineColumn: {
    width: 24,
    alignItems: "center",
  },
  timelineDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotOuterToday: {
    backgroundColor: PRIMARY_GREEN,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_GREEN,
  },
  timelineDotInnerToday: {
    backgroundColor: "#E6F7F1",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#d1fae5",
    marginTop: 2,
  },

  // Card
  card: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardToday: {
    backgroundColor: PRIMARY_GREEN,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY_GREEN,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dayTextToday: {
    color: "#E6F7F1",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  titleTextToday: {
    color: "#E6F7F1",
  },
  speakerText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  speakerTextToday: {
    color: "#D5F2E7",
  },
  chipColumn: {
    alignItems: "flex-end",
    marginLeft: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E0F4EC",
  },
  chipSmallMargin: {
    marginTop: 4,
  },
  chipToday: {
    backgroundColor: "#00654E",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  chipTextToday: {
    color: "#E6F7F1",
  },
  chipHoliday: {
    marginTop: 4,
    backgroundColor: "#fee2e2",
  },
  chipHolidayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b91c1c",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  rowIcon: {
    marginRight: 6,
  },
  rowText: {
    fontSize: 13,
    color: "#4b5563",
  },
  rowTextToday: {
    color: "#E6F7F1",
  },
});
