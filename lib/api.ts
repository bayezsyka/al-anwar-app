// lib/api.ts

const BASE_API_URL = "https://alanwarpakijangan.com/api";
const MYQURAN_BASE_URL = "https://api.myquran.com/v2";

// =======================
// Artikel (Laravel backend)
// =======================

export interface Category {
  id: number;
  name: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url?: string | null;
  category?: Category | null;
  author?: string | null;
  date?: string | null;
  views?: number | null;
}

export interface PaginatedMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginatedArticlesResponse {
  data: Article[];
  links: any;
  meta: PaginatedMeta;
}

export async function getArticles(
  page: number = 1
): Promise<PaginatedArticlesResponse> {
  const res = await fetch(`${BASE_API_URL}/articles?page=${page}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil artikel");
  }
  return res.json();
}

export async function getArticleDetail(
  slug: string
): Promise<{ data: Article }> {
  const res = await fetch(`${BASE_API_URL}/articles/${slug}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil detail artikel");
  }
  return res.json();
}

// =======================
// Rutinan (Laravel backend)
// =======================

export interface RutinanException {
  id: number;
  rutinan_id: number;
  libur_date: string; // YYYY-MM-DD
}

export interface Rutinan {
  id: number;
  nama_acara: string;
  pengisi: string | null;
  kitab: string | null;
  isi: string | null;
  tempat: string | null;
  waktu: string | null; // HH:MM:SS
  day_of_week: number; // 1–7 (Senin–Ahad)
  created_at: string;
  updated_at: string;
  exceptions: RutinanException[];
}

export async function getRutinanSchedule(): Promise<Rutinan[]> {
  const res = await fetch(`${BASE_API_URL}/rutinan`);
  if (!res.ok) {
    throw new Error("Gagal mengambil jadwal rutinan");
  }
  return res.json();
}

// =======================
// Jadwal Sholat (MyQuran)
// =======================

export interface SholatJadwal {
  tanggal: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  [key: string]: string;
}

export interface SholatLocationData {
  id: string;
  lokasi: string;
  daerah?: string;
  jadwal: SholatJadwal;
}

export async function getSholatToday(
  cityId: string,
  date: Date
): Promise<SholatLocationData> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const url = `${MYQURAN_BASE_URL}/sholat/jadwal/${cityId}/${year}/${month}/${day}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Gagal mengambil jadwal sholat");
  }

  const json = await res.json();
  return json.data as SholatLocationData;
}

// =======================
// Kalender Hijriah (MyQuran)
// =======================

export interface HijriData {
  date: [string, string, string]; // [hari, "27 Syaban 1445 H", "08-03-2024"]
  num: number[];
}

export async function getHijriToday(adj: number = -1): Promise<HijriData> {
  const url = `${MYQURAN_BASE_URL}/cal/hijr/?adj=${adj}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Gagal mengambil tanggal hijriah");
  }
  const json = await res.json();
  return json.data as HijriData;
}

// =======================
// Doa (MyQuran)
// =======================

export interface DoaItem {
  id?: number;
  nomor?: number;
  arab: string;
  indo: string;
  judul: string;
  source: string;
}

// Doa harian acak (untuk home)
export async function getRandomDoa(): Promise<DoaItem> {
  const res = await fetch(`${MYQURAN_BASE_URL}/doa/acak`);
  if (!res.ok) {
    throw new Error("Gagal mengambil doa");
  }
  const json = await res.json();
  return json.data as DoaItem;
}

// Semua doa (kalau butuh)
export async function getAllDoa(): Promise<DoaItem[]> {
  const res = await fetch(`${MYQURAN_BASE_URL}/doa/all`);
  if (!res.ok) {
    throw new Error("Gagal mengambil daftar doa");
  }
  const json = await res.json();
  return json.data as DoaItem[];
}

// List sumber / kategori doa
export async function getDoaSources(): Promise<string[]> {
  const res = await fetch(`${MYQURAN_BASE_URL}/doa/sumber`);
  if (!res.ok) {
    throw new Error("Gagal mengambil sumber doa");
  }
  const json = await res.json();
  return json.data as string[];
}

// Doa berdasarkan sumber (kategori)
export async function getDoaBySource(source: string): Promise<DoaItem[]> {
  const res = await fetch(`${MYQURAN_BASE_URL}/doa/sumber/${source}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil doa pada kategori");
  }
  const json = await res.json();
  return json.data as DoaItem[];
}

// Doa by id (opsional)
export async function getDoaById(id: number): Promise<DoaItem> {
  const res = await fetch(`${MYQURAN_BASE_URL}/doa/${id}`);
  if (!res.ok) {
    throw new Error("Gagal mengambil detail doa");
  }
  const json = await res.json();
  return json.data as DoaItem;
}
