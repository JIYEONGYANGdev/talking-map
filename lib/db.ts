/**
 * 데이터 계층. SUPABASE_URL/SUPABASE_SERVICE_KEY 가 있으면 Supabase,
 * 없으면 로컬 JSON 파일(data/db.json)에 저장한다. (로컬 개발·시연용)
 * 두 어댑터 모두 같은 함수 집합을 제공한다.
 */
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Agency, Report, School, Signal, Status, Zone } from "./types";

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

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- 동적 데이터(report, signal) ----------
export interface Store {
  insertReport(r: Report): Promise<void>;
  getReportByToken(token: string): Promise<Report | null>;
  getReport(id: string): Promise<Report | null>;
  insertSignal(s: Signal): Promise<void>;
  updateSignal(id: string, patch: Partial<Signal>): Promise<Signal | null>;
  getSignal(id: string): Promise<Signal | null>;
  getSignalByReport(reportId: string): Promise<Signal | null>;
  listSignals(filter?: { status?: Status; schoolId?: string }): Promise<Signal[]>;
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

const fileStore: Store = {
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

const supabaseStore: Store = {
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
};

export const store: Store =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? supabaseStore : fileStore;

export const storeKind = process.env.SUPABASE_URL ? "supabase" : "file";
