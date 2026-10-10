"use client";
import { useEffect } from "react";
import { rememberReport } from "@/lib/local";

/** 진행 확인 페이지를 연 기기에 이 신고를 "내 신고"로 남긴다 (문자 링크로 들어온 경우 대비) */
export default function Remember({ token, at, text, schoolId }: { token: string; at: string; text: string; schoolId?: string }) {
  useEffect(() => {
    rememberReport({ token, at, text, schoolId });
  }, [token, at, text, schoolId]);
  return null;
}
