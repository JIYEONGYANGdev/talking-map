"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Mascot from "@/components/Mascot";

/** 시연용: 비밀번호를 미리 채워 둔다(배포본은 ADMIN_PASSWORD 미설정 → 기본값). 실서비스 전환 때 "" 로. docs/decisions.md 2026-10-16 */
const DEMO_PASSWORD = "yangju2026";

export default function LoginForm() {
  const [pw, setPw] = useState(DEMO_PASSWORD);
  const [err, setErr] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", body: JSON.stringify({ password: pw }) });
    if (r.ok) router.refresh();
    else setErr(true);
  }
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-line rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Mascot size={44} mood="progress" />
          <div>
            <h1 className="font-bold text-lg">공무원 점검표</h1>
            <p className="text-xs text-muted">양주시 통학로 신고 확인·확정</p>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">비밀번호</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" className="h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand" placeholder="비밀번호" />
        </label>
        {err && <div className="text-xs text-priority-ink">비밀번호가 다릅니다.</div>}
        <button className="h-11 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark">들어가기</button>
        <p className="text-[11px] text-faint">프로토타입은 비밀번호 하나로 보호합니다{DEMO_PASSWORD ? " (시연용으로 미리 채워 두었어요)" : ""}. 실서비스는 시청 계정과 연동합니다.</p>
      </form>
    </div>
  );
}
