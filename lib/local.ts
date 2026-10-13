"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * 기기에 남기는 학부모 편의 정보. 서버에 저장하지 않는다(로그인 없음).
 * - tm_school: 마지막으로 고른 학교 id
 * - tm_reports: 내가 보낸 신고의 토큰 목록 (최신이 앞)
 * localStorage 가 막힌 환경(시크릿 모드 등)에서도 화면이 깨지지 않게 전부 try/catch.
 */
const SCHOOL_KEY = "tm_school";
const REPORTS_KEY = "tm_reports";

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useSchoolId(): [string | null, (id: string | null) => void, boolean] {
  const [id, setIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setIdState(readLocal<string | null>(SCHOOL_KEY, null));
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const setId = useCallback((v: string | null) => {
    setIdState(v);
    writeLocal(SCHOOL_KEY, v);
  }, []);
  return [id, setId, ready];
}

export type MyReport = { token: string; at: string; text: string; schoolId?: string };

export function useMyReports(): [MyReport[], (r: MyReport) => void, boolean] {
  const [list, setList] = useState<MyReport[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setList(readLocal<MyReport[]>(REPORTS_KEY, []));
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const add = useCallback((r: MyReport) => {
    setList((prev) => {
      const next = [r, ...prev.filter((x) => x.token !== r.token)].slice(0, 50);
      writeLocal(REPORTS_KEY, next);
      return next;
    });
  }, []);
  return [list, add, ready];
}

/** 진행 확인 페이지 등 서버 컴포넌트에서 토큰을 기기에 남길 때 */
export function rememberReport(r: MyReport) {
  const prev = readLocal<MyReport[]>(REPORTS_KEY, []);
  writeLocal(REPORTS_KEY, [r, ...prev.filter((x) => x.token !== r.token)].slice(0, 50));
}
export function rememberSchool(id: string) {
  writeLocal(SCHOOL_KEY, id);
}
