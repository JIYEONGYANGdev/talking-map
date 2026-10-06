"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { School } from "@/lib/types";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

export default function ReportForm({ schools, defaultSchoolId }: { schools: School[]; defaultSchoolId: string }) {
  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [text, setText] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ token: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const school = useMemo(() => schools.find((s) => s.id === schoolId) ?? schools[0], [schools, schoolId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("text", text);
    if (address) fd.set("address", address);
    if (picked) {
      fd.set("lat", String(picked.lat));
      fd.set("lng", String(picked.lng));
    }
    if (photo) fd.set("photo", await shrink(photo));
    const r = await fetch("/api/reports", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      setError("접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setResult(await r.json());
  }

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
        <div className="text-green-700 font-semibold">접수되었습니다.</div>
        <p className="text-sm text-zinc-600">
          AI가 종류와 담당 기관을 정리했고, 공무원이 확인한 뒤 지도에 표시됩니다. 아래 링크가 실제 서비스에서는
          회신 문자로 갑니다.
        </p>
        <Link href={`/reports/${result.token}`} className="inline-block rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">
          내 신고 진행 확인
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 bg-white rounded-xl border border-zinc-200 p-5">
      <label className="block text-sm">
        <span className="text-zinc-600">학교 (몰라도 됩니다)</span>
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="mt-1 w-full border rounded-lg px-2 py-2">
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">사진</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">무엇을 보셨나요? (평소 쓰시는 말로)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3} className="mt-1 w-full border rounded-lg px-2 py-2" placeholder="예: 정문 앞 횡단보도에 아침마다 차가 서 있어서 애들이 차 사이로 건너요" />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">주소나 위치 설명 (선택)</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full border rounded-lg px-2 py-2" placeholder="예: 옥정초 후문 쪽 편의점 앞" />
      </label>
      {school && (
        <div className="text-sm">
          <div className="text-zinc-600 mb-1">지도를 탭해서 위치를 찍어 주세요 (선택) {picked && <span className="text-red-600">· 지정됨</span>}</div>
          <SchoolMap center={{ lat: school.lat, lng: school.lng, name: school.name }} onPick={setPicked} picked={picked} height={260} />
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button disabled={busy} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50">
        {busy ? "AI가 정리하는 중…" : "보내기"}
      </button>
      <p className="text-xs text-zinc-500">
        이름·전화번호·차량번호는 AI에 보내기 전에 지웁니다. 사진과 신고자는 시민 화면에 나오지 않습니다.
      </p>
    </form>
  );
}

/** 브라우저에서 장변 1280px 로 축소 + EXIF 제거(캔버스 재인코딩) */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
