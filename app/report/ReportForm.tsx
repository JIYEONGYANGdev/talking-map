"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rememberReport, rememberSchool } from "@/lib/local";
import type { School } from "@/lib/types";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

const CHIPS = ["정문 앞 횡단보도", "후문 쪽 인도", "차가 서 있어요", "가로등이 꺼졌어요", "보도블록이 깨졌어요", "신호등이 이상해요"];

/**
 * 신고 3단계: 사진 → 한 줄 → 위치·보내기. 한 화면에 한 가지 일, 큰 버튼 하나.
 * 종류 선택은 없다(AI 가 정리, 공무원이 확정).
 */
export default function ReportForm({ schools, defaultSchoolId }: { schools: School[]; defaultSchoolId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [schoolId, setSchoolId] = useState(defaultSchoolId);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const school = useMemo(() => schools.find((s) => s.id === schoolId) ?? schools[0], [schools, schoolId]);

  useEffect(() => {
    if (!photo) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(photo);
    return () => reader.abort();
  }, [photo]);

  async function submit() {
    if (!text.trim()) {
      setStep(2);
      setError("무엇을 보셨는지 한 줄만 적어 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("text", text);
    if (picked) {
      fd.set("lat", String(picked.lat));
      fd.set("lng", String(picked.lng));
    }
    if (photo) fd.set("photo", await shrink(photo));
    const r = await fetch("/api/reports", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      setError("접수에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const out = (await r.json()) as { token: string };
    rememberReport({ token: out.token, at: new Date().toISOString(), text: text.slice(0, 60), schoolId: school?.id });
    if (school) rememberSchool(school.id);
    router.push(`/reports/${out.token}?new=1`);
  }

  const back = step === 1 ? null : () => setStep((s) => (s === 3 ? 2 : 1));

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-col gap-4 px-5 pt-4 flex-1">
        <div className="flex items-center justify-between">
          {back ? (
            <button type="button" onClick={back} aria-label="이전 단계" className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <ChevronLeft />
            </button>
          ) : (
            <Link href="/" aria-label="홈으로" className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <ChevronLeft />
            </Link>
          )}
          <div className="font-bold">신고하기</div>
          <div className="w-10 text-right text-[13px] text-muted">{step}/3</div>
        </div>

        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-[5px] rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="pt-1">
              <h1 className="text-[22px] font-bold leading-snug">무엇을 보셨나요?<br />사진 한 장이면 돼요</h1>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">종류를 고를 필요 없어요. AI가 정리하고 공무원이 확인합니다.</p>
            </div>
            <input ref={fileRef} id="report-photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            {!photo ? (
              <label htmlFor="report-photo" className="h-[300px] rounded-[24px] border-2 border-dashed border-[#9FC4B3] bg-white flex flex-col items-center justify-center gap-3 cursor-pointer active:bg-mint-deep">
                <div className="w-[72px] h-[72px] rounded-full bg-mint-deep flex items-center justify-center text-brand">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
                </div>
                <div className="text-[17px] font-bold">사진 찍기</div>
                <div className="text-[13px] text-muted">또는 앨범에서 올리기</div>
              </label>
            ) : (
              <div className="rounded-[24px] overflow-hidden bg-white border border-line">
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기
                  <img src={photoUrl} alt="올린 사진 미리보기" className="w-full max-h-[300px] object-contain bg-ink/5" />
                )}
                <div className="flex items-center justify-between px-4 py-2.5 text-xs text-muted">
                  <span className="truncate">{photo.name} · {Math.round(photo.size / 1024)}KB</span>
                  <span className="flex gap-3 shrink-0">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-brand-dark font-bold">다른 사진</button>
                    <button type="button" onClick={() => { setPhoto(null); setPhotoUrl(null); if (fileRef.current) fileRef.current.value = ""; }} className="underline">지우기</button>
                  </span>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl px-3.5 py-3 flex gap-2.5 text-[13px] text-muted leading-relaxed">
              <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              사진은 공무원만 봅니다. 이름·전화번호·차량번호는 AI에 보내기 전에 지웁니다.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {photo && (
              <div className="flex items-center gap-3">
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기
                  <img src={photoUrl} alt="" className="w-14 h-14 rounded-[14px] object-cover" />
                )}
                <div>
                  <div className="text-sm font-bold">사진 1장 올렸어요</div>
                  <button type="button" onClick={() => setStep(1)} className="text-[13px] text-brand-dark font-medium">다른 사진으로 바꾸기</button>
                </div>
              </div>
            )}
            <div className="pt-1">
              <h1 className="text-[22px] font-bold leading-snug">평소 쓰는 말로<br />한 줄만 적어 주세요</h1>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">어디서, 무엇이 불편했는지면 충분해요.</p>
            </div>
            <label className="block">
              <span className="sr-only">신고 내용</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
                autoFocus
                placeholder="예: 정문 앞 횡단보도에 아침마다 차가 서 있어서 애들이 차 사이로 건너요"
                className="w-full rounded-[20px] border-[1.5px] border-line bg-white p-4 text-base leading-relaxed outline-none resize-none focus:border-brand"
              />
            </label>
            <div>
              <div className="text-[13px] text-muted mb-2">자주 쓰는 표현을 눌러 넣을 수도 있어요</div>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => setText((t) => (t ? `${t.trimEnd()} ${c}` : c))} className="h-9 px-3.5 rounded-full bg-white border border-line text-[13px] font-medium active:bg-mint-deep">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="pt-1">
              <h1 className="text-[22px] font-bold leading-snug">어디쯤인가요?<br />지도를 한 번 탭해 주세요</h1>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">정확하지 않아도 괜찮아요. 공무원이 확인하며 바로잡습니다.</p>
            </div>
            <label className="flex items-center gap-2 bg-white rounded-2xl px-3.5 h-12">
              <span className="text-[13px] text-muted shrink-0">학교</span>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="flex-1 bg-transparent text-[15px] font-bold outline-none">
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            {school && (
              <div className="rounded-[24px] overflow-hidden border border-line">
                <SchoolMap center={{ lat: school.lat, lng: school.lng, name: school.name }} onPick={setPicked} picked={picked} height={300} />
              </div>
            )}
            <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${picked ? "bg-danger" : "bg-line"}`} />
              <div className="text-sm">
                {picked ? (
                  <>
                    <div className="font-bold">위치를 찍었어요</div>
                    <div className="text-xs text-muted">{school?.name} 기준 · 탭한 위치</div>
                  </>
                ) : (
                  <div className="text-muted">아직 위치를 찍지 않았어요. 모르면 그냥 보내도 돼요.</div>
                )}
              </div>
            </div>
          </>
        )}

        {error && <div className="text-sm text-danger">{error}</div>}
      </div>

      <div className="px-5 pt-3 pb-7 flex flex-col gap-2.5">
        {step < 3 ? (
          <>
            <button type="button" onClick={() => setStep((s) => (s === 1 ? 2 : 3))} disabled={step === 2 && !text.trim()} className="h-14 rounded-2xl bg-brand text-white text-[17px] font-bold disabled:opacity-40 active:bg-brand-dark">
              다음
            </button>
            {step === 1 ? (
              <button type="button" onClick={() => setStep(2)} className="h-11 text-sm font-medium text-muted">사진 없이 글로만 신고할게요</button>
            ) : (
              <div className="h-11 flex items-center justify-center text-xs text-muted">종류·담당 기관은 AI가 정리하고 공무원이 확정해요</div>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={submit} disabled={busy} className="h-14 rounded-2xl bg-brand text-white text-[17px] font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:bg-brand-dark">
              {busy ? (
                "AI가 정리하는 중…"
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" /></svg>
                  보내기
                </>
              )}
            </button>
            {!picked && !busy && <button type="button" onClick={submit} className="h-11 text-sm font-medium text-muted">위치는 잘 모르겠어요, 그냥 보낼게요</button>}
          </>
        )}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
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
