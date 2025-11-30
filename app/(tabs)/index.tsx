// app/(tabs)/index.tsx

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Article,
  DoaItem,
  getHijriToday,
  getArticles,
  getRandomDoa,
  getRutinanSchedule,
  getSholatToday,
  HijriData,
  Rutinan,
  SholatJadwal,
  SholatLocationData,
} from "../../lib/api";

// Color palette yang lebih minimalis
const PRIMARY_COLOR = "#008362";
const SECONDARY_COLOR = "#007483";
const BACKGROUND_COLOR = "#F8FAFC";
const CARD_BACKGROUND = "#FFFFFF";
const TEXT_PRIMARY = "#1E293B";
const TEXT_SECONDARY = "#64748B";
const TEXT_LIGHT = "#94A3B8";
const BORDER_COLOR = "#E2E8F0";
const ACCENT_COLOR = "#F59E0B";

type PrayerKey = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

const PRAYER_KEYS: PrayerKey[] = [
  "subuh",
  "dzuhur",
  "ashar",
  "maghrib",
  "isya",
];

const PRAYER_LABELS: Record<PrayerKey, string> = {
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

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
  const date = String(d.getDate()).padStart(2, "0");
  const monthName = MONTH_NAMES_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${date} ${monthName} ${year}`;
}

function formatDateWithDay(d: Date): string {
  const dayName = DAY_NAMES_FULL[d.getDay()];
  const date = String(d.getDate()).padStart(2, "0");
  const monthName = MONTH_NAMES_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
}

function formatTimeHM(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function parseTimeToday(base: Date, timeStr: string): Date {
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr || 0);
  const m = Number(mStr || 0);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function getNextPrayer(
  schedule: SholatJadwal,
  now: Date
): { key: PrayerKey; label: string; time: Date } {
  const base = new Date(now);
  base.setSeconds(0, 0);
  const candidates = PRAYER_KEYS.map((key) => {
    const t = parseTimeToday(base, schedule[key]);
    return { key, label: PRAYER_LABELS[key], time: t };
  });
  const upcoming = candidates.find((c) => c.time.getTime() >= now.getTime());
  if (upcoming) return upcoming;
  // kalau semua sudah lewat, next Subuh besok
  const nextDay = new Date(base);
  nextDay.setDate(nextDay.getDate() + 1);
  const subuhTomorrow = parseTimeToday(nextDay, schedule.subuh);
  return { key: "subuh", label: PRAYER_LABELS.subuh, time: subuhTomorrow };
}

function dayOfWeekToJsIndex(day: number): number {
  if (day === 7) return 0; // Minggu
  return day; // 1..6 = Senin..Sabtu
}

function isSameCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeNextOccurrenceForRutinan(r: Rutinan, from: Date): Date | null {
  if (!r.day_of_week) return null;
  const jsTarget = dayOfWeekToJsIndex(r.day_of_week);
  const base = new Date(from);
  base.setSeconds(0, 0);
  for (let offset = 0; offset < 21; offset++) {
    const candidate = new Date(base);
    candidate.setHours(0, 0, 0, 0);
    candidate.setDate(base.getDate() + offset);
    if (candidate.getDay() !== jsTarget) continue;
    const timeStr = r.waktu || "00:00:00";
    const [hh = "0", mm = "0"] = timeStr.split(":");
    candidate.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    if (candidate.getTime() <= from.getTime()) continue;
    const candidateYmd = buildYMD(candidate);
    const isLibur =
      r.exceptions && r.exceptions.some((ex) => ex.libur_date === candidateYmd);
    if (isLibur) continue;
    return candidate;
  }
  return null;
}

function computeNearestRutinan(
  list: Rutinan[],
  from: Date
): { event: Rutinan; date: Date } | null {
  let best: { event: Rutinan; date: Date } | null = null;
  for (const r of list) {
    const nextDate = computeNextOccurrenceForRutinan(r, from);
    if (!nextDate) continue;
    if (!best || nextDate.getTime() < best.date.getTime()) {
      best = { event: r, date: nextDate };
    }
  }
  return best;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [cityId, setCityId] = useState<string>("1219");
  const [lokasi, setLokasi] = useState<string>("Kota Semarang");
  const [sholatJadwal, setSholatJadwal] = useState<SholatJadwal | null>(null);
  const [loadingSholat, setLoadingSholat] = useState(false);
  const [errorSholat, setErrorSholat] = useState<string | null>(null);
  const [hijriData, setHijriData] = useState<HijriData | null>(null);
  const [loadingHijri, setLoadingHijri] = useState(false);
  const [errorHijri, setErrorHijri] = useState<string | null>(null);
  const [nextLabel, setNextLabel] = useState<string>("");
  const [nextTimeDisplay, setNextTimeDisplay] = useState<string>("");
  const [countdownDisplay, setCountdownDisplay] = useState<string>("00:00:00");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [todayDoa, setTodayDoa] = useState<DoaItem | null>(null);
  const [loadingDoa, setLoadingDoa] = useState(false);
  const [errorDoa, setErrorDoa] = useState<string | null>(null);
  const [loadingRutinan, setLoadingRutinan] = useState(false);
  const [errorRutinan, setErrorRutinan] = useState<string | null>(null);
  const [nearestRutinan, setNearestRutinan] = useState<{
    event: Rutinan;
    date: Date;
  } | null>(null);
  const [headlineArticles, setHeadlineArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [errorArticles, setErrorArticles] = useState<string | null>(null);

  // Animation values
  const [scaleAnim] = useState(new Animated.Value(1));
  const [locationPressAnim] = useState(new Animated.Value(1));

  // In-app info banner
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // fetch jadwal sholat setiap kali cityId berubah
  useEffect(() => {
    const fetchSholat = async () => {
      try {
        setLoadingSholat(true);
        setErrorSholat(null);
        const today = new Date();
        const data: SholatLocationData = await getSholatToday(cityId, today);
        setSholatJadwal(data.jadwal);
        if (data.lokasi) setLokasi(data.lokasi);
      } catch (e: any) {
        setErrorSholat(e?.message || "Gagal memuat jadwal sholat");
      } finally {
        setLoadingSholat(false);
      }
    };
    fetchSholat();
  }, [cityId]);

  // fetch hijriah (sekali di awal)
  useEffect(() => {
    const fetchHijri = async () => {
      try {
        setLoadingHijri(true);
        setErrorHijri(null);
        const data = await getHijriToday(-1);
        setHijriData(data);
      } catch (e: any) {
        setErrorHijri(e?.message || "Gagal memuat tanggal hijriah");
      } finally {
        setLoadingHijri(false);
      }
    };
    fetchHijri();
  }, []);

  // fetch doa hari ini (acak)
  useEffect(() => {
    const fetchDoa = async () => {
      try {
        setLoadingDoa(true);
        setErrorDoa(null);
        const data = await getRandomDoa();
        setTodayDoa(data);
      } catch (e: any) {
        setErrorDoa(e?.message || "Gagal memuat doa hari ini");
      } finally {
        setLoadingDoa(false);
      }
    };
    fetchDoa();
  }, []);

  // fetch rutinan & cari yang terdekat
  useEffect(() => {
    const fetchRutinan = async () => {
      try {
        setLoadingRutinan(true);
        setErrorRutinan(null);
        const data = await getRutinanSchedule();
        const now = new Date();
        const nearest = computeNearestRutinan(data, now);
        setNearestRutinan(nearest);
      } catch (e: any) {
        setErrorRutinan(e?.message || "Gagal memuat jadwal rutinan");
      } finally {
        setLoadingRutinan(false);
      }
    };
    fetchRutinan();
  }, []);

  // fetch headline artikel
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoadingArticles(true);
        setErrorArticles(null);
        const res = await getArticles(1);
        setHeadlineArticles(res.data.slice(0, 3));
      } catch (e: any) {
        setErrorArticles(e?.message || "Gagal memuat artikel terbaru");
      } finally {
        setLoadingArticles(false);
      }
    };

    fetchArticles();
  }, []);

  // hitung next sholat + countdown
  useEffect(() => {
    if (!sholatJadwal) return;
    const update = () => {
      const now = new Date();
      const { key, label, time } = getNextPrayer(sholatJadwal, now);
      setNextLabel(label);
      setNextTimeDisplay(`${sholatJadwal[key]}`);
      const diffMs = time.getTime() - now.getTime();
      const totalSec = Math.max(0, Math.floor(diffMs / 1000));
      const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      const s = String(totalSec % 60).padStart(2, "0");
      setCountdownDisplay(`${h}:${m}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [sholatJadwal]);

  const today = new Date();
  const masehiText = formatFullDate(today);
  const hijriText = hijriData?.date?.[1];
  const combinedDate = hijriText ? `${masehiText} / ${hijriText}` : masehiText;

  const nearestDateText = nearestRutinan
    ? formatDateWithDay(nearestRutinan.date)
    : "";

  const nearestTimeText = nearestRutinan
    ? formatTimeHM(nearestRutinan.date)
    : "";

  const isNearestToday =
    nearestRutinan && isSameCalendarDate(nearestRutinan.date, today);

  const horizontalPadding = Math.max(16, Math.min(24, width * 0.06));
  const contentWidth = Math.min(760, width - horizontalPadding * 2);
  const blockGap = width < 360 ? 12 : 16;

  const handleUpdateLocationPress = () => {
    Animated.sequence([
      Animated.timing(locationPressAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(locationPressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    handleUpdateLocation();
  };

  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      setLocationError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Izin lokasi ditolak.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = reverse[0];
      const rawCity =
        place.city ||
        place.subregion ||
        place.region ||
        place.district ||
        place.country;
      if (!rawCity) {
        setLocationError("Tidak dapat menentukan nama kota dari lokasi.");
        return;
      }
      const queryName = encodeURIComponent(rawCity);
      const res = await fetch(
        `https://api.myquran.com/v2/sholat/kota/cari/${queryName}`
      );
      if (!res.ok) {
        throw new Error("Gagal mencari kota di MyQuran.");
      }
      const json = await res.json();
      const first = json?.data?.[0];
      if (!first?.id) {
        setLocationError("Kota tidak ditemukan di MyQuran.");
        return;
      }
      const newCityId: string = first.id;
      const newCityName: string = first.lokasi || rawCity.toUpperCase();
      setCityId(newCityId);
      setLokasi(newCityName);
    } catch (e: any) {
      setLocationError(e?.message || "Gagal memperbarui lokasi.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleNavPress = (route: Href) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push(route);
    });
  };

  const handleOpenWebsite = () => {
    Linking.openURL("https://alanwarpakijangan.com");
  };

  return (
    <SafeAreaView style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND_COLOR} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.headerContent, { maxWidth: contentWidth }]}>
          <Image
            source={{
              uri: "https://alanwarpakijangan.com/images/logoarab.png",
            }}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.locationText}>{lokasi}</Text>
            <Pressable onPress={handleUpdateLocationPress}>
              <Text style={styles.locationUpdateText}>
                {updatingLocation ? "..." : "Perbarui"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            gap: blockGap,
            alignItems: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Prayer Time Card */}
        <View style={[styles.prayerCard, { maxWidth: contentWidth }]}>
          {loadingSholat && !sholatJadwal ? (
            <View style={styles.prayerLoading}>
              <ActivityIndicator color={CARD_BACKGROUND} size="large" />
              <Text style={styles.prayerLoadingText}>
                Memuat jadwal sholat...
              </Text>
            </View>
          ) : errorSholat ? (
            <View style={styles.prayerError}>
              <Ionicons name="alert-circle" size={24} color={CARD_BACKGROUND} />
              <Text style={styles.prayerErrorText}>{errorSholat}</Text>
            </View>
          ) : sholatJadwal ? (
            <View style={styles.prayerContent}>
              <Text style={styles.prayerSubtitle}>Sholat Berikutnya</Text>
              <Text style={styles.prayerTitle}>
                {nextLabel} • {nextTimeDisplay}
              </Text>
              <Text style={styles.countdown}>{countdownDisplay}</Text>
              <Text style={styles.dateText}>{combinedDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Info Banner (in-app alert) */}
        {showInfoBanner && (
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerHeader}>
              <View style={styles.infoTitleRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.infoTitle}>Informasi Aplikasi</Text>
              </View>
              <Pressable onPress={() => setShowInfoBanner(false)}>
                <Ionicons name="close" size={18} color={TEXT_LIGHT} />
              </Pressable>
            </View>
            <Text style={styles.infoText}>
              Aplikasi ini masih dalam tahap pengembangan, mohon untuk tidak
              menyebarluaskan.{"\n\n"}
              Untuk informasi Pesantren lebih lengkap, kunjungi Website utama.
            </Text>
            <Pressable
              style={styles.infoLinkButton}
              onPress={handleOpenWebsite}
            >
              <Text style={styles.infoLinkText}>Kunjungi Website utama</Text>
              <Ionicons name="open-outline" size={16} color={PRIMARY_COLOR} />
            </Pressable>
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.section, { maxWidth: contentWidth }]}>
          <Text style={styles.sectionTitle}>Menu Utama</Text>
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickAction, { flexBasis: width < 420 ? "48%" : "30%" }]}
              onPress={() => handleNavPress("../article")}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E0F2FE" }]}
              >
                <Ionicons name="book" size={24} color={PRIMARY_COLOR} />
              </View>
              <Text style={styles.quickActionText}>Artikel</Text>
            </Pressable>

            <Pressable
              style={styles.quickAction}
              onPress={() => handleNavPress("/rutinan")}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E0F2FE" }]}
              >
                <Ionicons name="calendar" size={24} color={PRIMARY_COLOR} />
              </View>
              <Text style={styles.quickActionText}>Rutinan</Text>
            </Pressable>

            <Pressable
              style={styles.quickAction}
              onPress={() => handleNavPress("/doa")}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: "#E0F2FE" }]}
              >
                <Ionicons name="moon" size={24} color={PRIMARY_COLOR} />
              </View>
              <Text style={styles.quickActionText}>Doa</Text>
            </Pressable>
          </View>
        </View>

        {/* Next Routine */}
        <View style={[styles.section, { maxWidth: contentWidth }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rutinan Terdekat</Text>
            <Pressable onPress={() => router.push("/rutinan")}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </Pressable>
          </View>

          {loadingRutinan && !nearestRutinan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Memuat jadwal rutinan...</Text>
            </View>
          ) : errorRutinan ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={TEXT_LIGHT} />
              <Text style={styles.errorText}>{errorRutinan}</Text>
            </View>
          ) : !nearestRutinan ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar" size={24} color={TEXT_LIGHT} />
              <Text style={styles.emptyText}>Tidak ada rutinan mendatang</Text>
            </View>
          ) : (
            <Pressable
              style={styles.routineCard}
              onPress={() => router.push("/rutinan")}
            >
              <View style={styles.routineHeader}>
                <View style={styles.routineIcon}>
                  <Ionicons name="time" size={16} color={PRIMARY_COLOR} />
                </View>
                <Text style={styles.routineTime}>{nearestTimeText}</Text>
                {isNearestToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Hari Ini</Text>
                  </View>
                )}
              </View>
              <Text style={styles.routineTitle} numberOfLines={2}>
                {nearestRutinan.event.nama_acara}
              </Text>
              <Text style={styles.routineDate}>{nearestDateText}</Text>
              {nearestRutinan.event.tempat && (
                <View style={styles.routineDetail}>
                  <Ionicons name="location" size={14} color={TEXT_LIGHT} />
                  <Text style={styles.routineDetailText}>
                    {nearestRutinan.event.tempat}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Headline Articles */}
        <View style={[styles.section, { maxWidth: contentWidth }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Headline</Text>
            <Pressable onPress={() => router.push("/article")}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </Pressable>
          </View>

          {loadingArticles && !headlineArticles.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Memuat artikel...</Text>
            </View>
          ) : errorArticles ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={TEXT_LIGHT} />
              <Text style={styles.errorText}>{errorArticles}</Text>
            </View>
          ) : headlineArticles.length ? (
            <View style={styles.headlineList}>
              {headlineArticles.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.headlineCard}
                  onPress={() =>
                    router.push({
                      pathname: "/article/[slug]",
                      params: { slug: item.slug },
                    })
                  }
                >
                  <View style={styles.headlineTextBlock}>
                    <Text style={styles.headlineTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.headlineMeta} numberOfLines={1}>
                      {item.category?.name ?? "Tanpa Kategori"} • {item.date ?? "-"}
                    </Text>
                    <Text style={styles.headlineExcerpt} numberOfLines={2}>
                      {item.excerpt}
                    </Text>
                  </View>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.headlineImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper" size={24} color={TEXT_LIGHT} />
              <Text style={styles.emptyText}>Belum ada artikel.</Text>
            </View>
          )}
        </View>

        {/* Today's Prayer */}
        <View style={[styles.section, { maxWidth: contentWidth }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Doa Hari Ini</Text>
            <Pressable onPress={() => router.push("/doa")}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </Pressable>
          </View>

          {loadingDoa && !todayDoa ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Memuat doa...</Text>
            </View>
          ) : errorDoa ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={TEXT_LIGHT} />
              <Text style={styles.errorText}>{errorDoa}</Text>
            </View>
          ) : todayDoa ? (
            <View style={styles.prayerCardToday}>
              <View style={styles.prayerHeader}>
                <Text style={styles.prayerSource}>
                  {(todayDoa.source || "doa/pilihan").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.prayerTitleToday}>{todayDoa.judul}</Text>
              <Text style={styles.prayerArabic}>{todayDoa.arab}</Text>
              <Text style={styles.prayerTranslation}>{todayDoa.indo}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: BACKGROUND_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  logo: {
    width: 120,
    height: 32,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: "500",
    flexShrink: 1,
  },
  locationUpdateText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  prayerCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    padding: 24,
    alignSelf: "stretch",
    shadowColor: PRIMARY_COLOR,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  prayerLoading: {
    alignItems: "center",
    paddingVertical: 20,
  },
  prayerLoadingText: {
    color: CARD_BACKGROUND,
    fontSize: 14,
    marginTop: 8,
    opacity: 0.8,
  },
  prayerError: {
    alignItems: "center",
    paddingVertical: 20,
  },
  prayerErrorText: {
    color: CARD_BACKGROUND,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  prayerContent: {
    alignItems: "center",
  },
  prayerSubtitle: {
    color: CARD_BACKGROUND,
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
    marginBottom: 4,
  },
  prayerTitle: {
    color: CARD_BACKGROUND,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  countdown: {
    color: CARD_BACKGROUND,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Menlo",
    letterSpacing: 1,
    marginBottom: 12,
  },
  dateText: {
    color: CARD_BACKGROUND,
    fontSize: 13,
    opacity: 0.9,
  },

  // info banner
  infoBanner: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 8,
  },
  infoBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  infoText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
  },
  infoLinkButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
  },
  infoLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },

  section: {
    gap: 12,
    alignSelf: "stretch",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  seeAllText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: 140,
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    textAlign: "center",
  },
  headlineList: {
    gap: 12,
  },
  headlineCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headlineTextBlock: {
    flex: 1,
    gap: 6,
  },
  headlineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  headlineMeta: {
    fontSize: 12,
    color: TEXT_LIGHT,
  },
  headlineExcerpt: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  headlineImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_LIGHT,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: TEXT_LIGHT,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_LIGHT,
  },
  routineCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  routineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  routineIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  routineTime: {
    fontSize: 15,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    flex: 1,
  },
  todayBadge: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: CARD_BACKGROUND,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  routineDate: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  routineDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routineDetailText: {
    fontSize: 13,
    color: TEXT_LIGHT,
  },
  prayerCardToday: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  prayerHeader: {
    marginBottom: 12,
  },
  prayerSource: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
  },
  prayerTitleToday: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  prayerArabic: {
    fontSize: 20,
    color: TEXT_PRIMARY,
    textAlign: "right",
    lineHeight: 32,
    marginBottom: 12,
    fontWeight: "500",
  },
  prayerTranslation: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },
});
