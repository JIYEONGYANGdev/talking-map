"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", body: JSON.stringify({ password: pw }) });
    if (r.ok) router.refresh();
    else setErr(true);
  }
  return (
    <form onSubmit={submit} className="max-w-sm bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
      <h1 className="font-semibold">공무원 화면</h1>
      <p className="text-xs text-zinc-500">프로토타입은 비밀번호 하나로 보호합니다. 실서비스는 시청 계정 연동.</p>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm" placeholder="비밀번호" />
      {err && <div className="text-xs text-red-600">비밀번호가 다릅니다.</div>}
      <button className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm">들어가기</button>
    </form>
  );
}
