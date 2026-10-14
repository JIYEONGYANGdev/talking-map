/**
 * 데이터 계층. SUPABASE_URL/SUPABASE_SERVICE_KEY 가 있으면 Supabase,
 * 없으면 로컬 JSON 파일(data/db.json)에 저장한다. (로컬 개발·시연용)
 * 두 어댑터 모두 같은 함수 집합을 제공한다.
 */
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Accident, Agency, Report, School, Signal, Status, Zone } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// ---------- 정적 데이터(공공데이터 적재 결과) ----------
export async function getSchools(): Promise<School[]> {
  return readJson<School[]>("schools.json", []);
}
export async function getZones(): Promise<Zone[]> {
  return readJson<Zone[]>("zones.json", []);
}
export async function getAgencies(): Promise<Agency[]> {
  return readJson<Agency[]>("agencies.json", []);
}
/** scripts/load-accidents.ts 가 만든다. 없으면 빈 배열(= "아직 사고 지도에 없음") */
export async function getAccidents(): Promise<Accident[]> {
  return readJson<Accident[]>("accidents.json", []);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- 동적 데이터(report, signal) ----------
export type MonthlyReport = {
  schoolId: string;
  month: string; // YYYY-MM
  total: number;
  resolved: number;
  body: string;
  generatedAt: string;
  /** AI 초안(draft)은 담당자가 읽고 고친 뒤 공개(published)해야 학부모에게 보인다. 값이 없으면 공개된 것으로 본다(상태 기능 이전 데이터). */
  status?: "draft" | "published";
  publishedAt?: string | null;
  editedAt?: string | null;
  /** 담당자가 본문을 고쳐 저장한 횟수 */
  editCount?: number;
};

/** 학부모에게 보여도 되는 리포트인가. status 가 없던 시절의 리포트는 공개로 친다. */
export const isPublished = (r: MonthlyReport | null | undefined): r is MonthlyReport => Boolean(r) && r!.status !== "draft";

export type PhotoMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface Store {
  /** 시연 데이터 초기화: 신고·신호·월간 리포트를 모두 지운다 (사진 파일은 남겨도 무해). 공무원 인증 뒤에만 호출. */
  clearAll(): Promise<{ reports: number; signals: number }>;
  /** 공무원 열람용 사진 저장. 돌려주는 값은 report.photoUrl 에 넣는 내부 경로(공개 URL 아님). */
  savePhoto(reportId: string, data: Buffer, mediaType: PhotoMediaType): Promise<string>;
  getPhoto(photoUrl: string): Promise<{ data: Buffer; mediaType: PhotoMediaType } | null>;
  saveMonthlyReport(r: MonthlyReport): Promise<void>;
  getMonthlyReport(schoolId: string, month: string): Promise<MonthlyReport | null>;
  /** 모든 학교·달의 리포트(본문 포함). 공무원 패널의 상태 요약용 — 수십 건 수준이라 전부 돌려준다. */
  listMonthlyReports(): Promise<MonthlyReport[]>;
  insertReport(r: Report): Promise<void>;
  getReportByToken(token: string): Promise<Report | null>;
  getReport(id: string): Promise<Report | null>;
  insertSignal(s: Signal): Promise<void>;
  updateSignal(id: string, patch: Partial<Signal>): Promise<Signal | null>;
  getSignal(id: string): Promise<Signal | null>;
  getSignalByReport(reportId: string): Promise<Signal | null>;
  listSignals(filter?: { status?: Status; schoolId?: string }): Promise<Signal[]>;
  /** 신호 하나와 그 신고·사진을 함께 지운다(시연 데이터 정리용, 공무원 인증 뒤에만). 되돌릴 수 없다. 없으면 false */
  deleteSignal(id: string): Promise<boolean>;
}

// --- JSON 파일 어댑터 ---
type FileDb = { reports: Report[]; signals: Signal[] };
const DB_FILE = path.join(DATA_DIR, "db.json");
let writing: Promise<void> = Promise.resolve();

async function loadFile(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as FileDb;
  } catch {
    return { reports: [], signals: [] };
  }
}
async function saveFile(db: FileDb) {
  writing = writing.then(() => fs.writeFile(DB_FILE, JSON.stringify(db, null, 2)));
  await writing;
}

const REPORTS_DIR = path.join(DATA_DIR, "reports");
const PHOTOS_DIR = path.join(DATA_DIR, "photos");
const EXT: Record<PhotoMediaType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MT_BY_EXT: Record<string, PhotoMediaType> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const safePhotoName = (photoUrl: string) => path.basename(photoUrl).replace(/[^a-zA-Z0-9._-]/g, "");

const fileStore: Store = {
  async clearAll() {
    const db = await loadFile();
    const n = { reports: db.reports.length, signals: db.signals.length };
    await saveFile({ reports: [], signals: [] });
    await fs.rm(REPORTS_DIR, { recursive: true, force: true });
    return n;
  },
  async savePhoto(reportId, data, mediaType) {
    await fs.mkdir(PHOTOS_DIR, { recursive: true });
    const name = `${reportId}.${EXT[mediaType]}`;
    await fs.writeFile(path.join(PHOTOS_DIR, name), data);
    return `photos/${name}`;
  },
  async getPhoto(photoUrl) {
    try {
      const name = safePhotoName(photoUrl);
      const data = await fs.readFile(path.join(PHOTOS_DIR, name));
      return { data, mediaType: MT_BY_EXT[name.split(".").pop() ?? ""] ?? "image/jpeg" };
    } catch {
      return null;
    }
  },
  async saveMonthlyReport(r) {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    await fs.writeFile(path.join(REPORTS_DIR, `${r.schoolId}_${r.month}.json`), JSON.stringify(r, null, 2));
  },
  async getMonthlyReport(schoolId, month) {
    try {
      return JSON.parse(await fs.readFile(path.join(REPORTS_DIR, `${schoolId}_${month}.json`), "utf8")) as MonthlyReport;
    } catch {
      return null;
    }
  },
  async listMonthlyReports() {
    try {
      const names = (await fs.readdir(REPORTS_DIR)).filter((n) => n.endsWith(".json"));
      const all = await Promise.all(names.map(async (n) => JSON.parse(await fs.readFile(path.join(REPORTS_DIR, n), "utf8")) as MonthlyReport));
      return all.sort((x, y) => y.month.localeCompare(x.month));
    } catch {
      return [];
    }
  },
  async insertReport(r) {
    const db = await loadFile();
    db.reports.push(r);
    await saveFile(db);
  },
  async getReportByToken(token) {
    return (await loadFile()).reports.find((r) => r.token === token) ?? null;
  },
  async getReport(id) {
    return (await loadFile()).reports.find((r) => r.id === id) ?? null;
  },
  async insertSignal(s) {
    const db = await loadFile();
    db.signals.push(s);
    await saveFile(db);
  },
  async updateSignal(id, patch) {
    const db = await loadFile();
    const i = db.signals.findIndex((s) => s.id === id);
    if (i < 0) return null;
    db.signals[i] = { ...db.signals[i], ...patch, updatedAt: new Date().toISOString() };
    await saveFile(db);
    return db.signals[i];
  },
  async getSignal(id) {
    return (await loadFile()).signals.find((s) => s.id === id) ?? null;
  },
  async getSignalByReport(reportId) {
    return (await loadFile()).signals.find((s) => s.reportId === reportId) ?? null;
  },
  async listSignals(filter) {
    let list = (await loadFile()).signals;
    if (filter?.status) list = list.filter((s) => s.status === filter.status);
    if (filter?.schoolId) list = list.filter((s) => s.schoolId === filter.schoolId);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async deleteSignal(id) {
    const db = await loadFile();
    const sig = db.signals.find((s) => s.id === id);
    if (!sig) return false;
    const report = db.reports.find((r) => r.id === sig.reportId);
    db.signals = db.signals.filter((s) => s.id !== id);
    db.reports = db.reports.filter((r) => r.id !== sig.reportId);
    await saveFile(db);
    if (report?.photoUrl) await fs.rm(path.join(PHOTOS_DIR, safePhotoName(report.photoUrl)), { force: true });
    return true;
  },
};

// --- Supabase 어댑터 (supabase/schema.sql 과 컬럼명 일치) ---
function supa(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}
const toRow = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()), v]));
const fromRow = <T>(o: Record<string, unknown> | null): T | null =>
  o ? (Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])) as T) : null;

const PHOTO_BUCKET = "photos"; // 비공개 버킷. 서비스 키로만 읽고 쓴다.

const supabaseStore: Store = {
  async clearAll() {
    const c = supa();
    const { count: signals } = await c.from("signal").select("*", { count: "exact", head: true });
    const { count: reports } = await c.from("report").select("*", { count: "exact", head: true });
    // signal 이 report 를 참조하므로 순서대로. neq 조건은 "전체 삭제" 를 허용하기 위한 관용구.
    for (const t of ["signal", "report", "monthly_report"]) {
      const { error } = await c.from(t).delete().neq(t === "monthly_report" ? "month" : "id", "");
      if (error) throw error;
    }
    return { reports: reports ?? 0, signals: signals ?? 0 };
  },
  async savePhoto(reportId, data, mediaType) {
    const name = `${reportId}.${EXT[mediaType]}`;
    const upload = () => supa().storage.from(PHOTO_BUCKET).upload(name, data, { contentType: mediaType, upsert: true });
    let { error } = await upload();
    if (error && /bucket/i.test(error.message)) {
      // 버킷이 없으면 만들고 한 번 더 (schema.sql 을 안 돌린 경우 대비)
      await supa().storage.createBucket(PHOTO_BUCKET, { public: false });
      ({ error } = await upload());
    }
    if (error) throw error;
    return `photos/${name}`;
  },
  async getPhoto(photoUrl) {
    const name = safePhotoName(photoUrl);
    const { data, error } = await supa().storage.from(PHOTO_BUCKET).download(name);
    if (error || !data) return null;
    return { data: Buffer.from(await data.arrayBuffer()), mediaType: MT_BY_EXT[name.split(".").pop() ?? ""] ?? "image/jpeg" };
  },
  async saveMonthlyReport(r) {
    let { error } = await supa().from("monthly_report").upsert(toRow(r), { onConflict: "school_id,month" });
    if (error && /column/i.test(error.message)) {
      // supabase/migrations/2026-10-14_monthly_report_status.sql 을 아직 안 돌린 경우: 상태 열 없이 저장하고 경고만 남긴다(그 리포트는 공개로 보인다)
      console.warn("[db] monthly_report 에 status 열이 없습니다. 마이그레이션을 실행하세요:", error.message);
      const { status: _s, publishedAt: _p, editedAt: _e, editCount: _c, ...legacy } = r;
      void _s; void _p; void _e; void _c;
      ({ error } = await supa().from("monthly_report").upsert(toRow(legacy), { onConflict: "school_id,month" }));
    }
    if (error) throw error;
  },
  async getMonthlyReport(schoolId, month) {
    const { data } = await supa().from("monthly_report").select("*").eq("school_id", schoolId).eq("month", month).maybeSingle();
    return fromRow<MonthlyReport>(data);
  },
  async listMonthlyReports() {
    const { data, error } = await supa().from("monthly_report").select("*").order("month", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => fromRow<MonthlyReport>(r)!) as MonthlyReport[];
  },
  async insertReport(r) {
    const { error } = await supa().from("report").insert(toRow(r));
    if (error) throw error;
  },
  async getReportByToken(token) {
    const { data } = await supa().from("report").select("*").eq("token", token).maybeSingle();
    return fromRow<Report>(data);
  },
  async getReport(id) {
    const { data } = await supa().from("report").select("*").eq("id", id).maybeSingle();
    return fromRow<Report>(data);
  },
  async insertSignal(s) {
    const { error } = await supa().from("signal").insert(toRow(s));
    if (error) throw error;
  },
  async updateSignal(id, patch) {
    const { data, error } = await supa()
      .from("signal")
      .update(toRow({ ...patch, updatedAt: new Date().toISOString() }))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return fromRow<Signal>(data);
  },
  async getSignal(id) {
    const { data } = await supa().from("signal").select("*").eq("id", id).maybeSingle();
    return fromRow<Signal>(data);
  },
  async getSignalByReport(reportId) {
    const { data } = await supa().from("signal").select("*").eq("report_id", reportId).maybeSingle();
    return fromRow<Signal>(data);
  },
  async listSignals(filter) {
    let q = supa().from("signal").select("*").order("updated_at", { ascending: false });
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.schoolId) q = q.eq("school_id", filter.schoolId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => fromRow<Signal>(r)!) as Signal[];
  },
  async deleteSignal(id) {
    const c = supa();
    const sig = await this.getSignal(id);
    if (!sig) return false;
    const report = await this.getReport(sig.reportId);
    // signal 이 report 를 참조하므로 순서대로
    let { error } = await c.from("signal").delete().eq("id", id);
    if (error) throw error;
    ({ error } = await c.from("report").delete().eq("id", sig.reportId));
    if (error) throw error;
    if (report?.photoUrl) await c.storage.from(PHOTO_BUCKET).remove([safePhotoName(report.photoUrl)]);
    return true;
  },
};

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
if (!useSupabase && process.env.VERCEL) {
  // 서버리스 파일시스템은 읽기 전용이고 요청 간에 유지되지 않는다. 신고 접수가 500 으로 실패한다.
  console.error("[db] SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없어 파일 저장소를 쓰려 합니다. Vercel 에서는 Supabase 가 필수입니다.");
}
export const store: Store = useSupabase ? supabaseStore : fileStore;

export const storeKind = useSupabase ? "supabase" : "file";
