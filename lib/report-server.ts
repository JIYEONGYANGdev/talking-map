import type { Signal } from "@/lib/types";
import { store } from "@/lib/db";
import { inReport } from "@/lib/report";

/** 리포트에 들어갈 신호 조회 (서버 전용). 규칙은 lib/report.ts inReport. */
export async function reportSignals(schoolId: string, month: string): Promise<Signal[]> {
  return (await store.listSignals({ schoolId })).filter((s) => inReport(s, month));
}
