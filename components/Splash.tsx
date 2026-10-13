"use client";
import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";

const KEY = "tm_splash_seen";

/**
 * 서비스에 처음 들어올 때 잠깐 보여주는 소개 화면. 탭당 한 번(sessionStorage), 1.6초 뒤 자동으로 사라지고 탭하면 바로 닫힌다.
 * 화면을 가리기만 하고 데이터 로딩은 뒤에서 그대로 진행된다.
 */
export default function Splash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "fade">("hidden");
  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {}
    if (seen) return;
    // "봤다" 표시는 사라질 때 남긴다 (마운트 때 남기면 개발 모드의 effect 2회 실행에서 두 번째 실행이 바로 건너뛴다)
    const done = () => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
      setPhase("hidden");
    };
    const t0 = setTimeout(() => setPhase("show"), 0);
    const t1 = setTimeout(() => setPhase("fade"), 1600);
    const t2 = setTimeout(done, 2100);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (phase === "hidden") return null;
  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setPhase("hidden");
  };
  return (
    <div
      onClick={dismiss}
      role="presentation"
      className={`fixed inset-0 z-[2000] bg-brand text-white flex flex-col items-center justify-center gap-5 transition-opacity duration-500 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}
    >
      <div className="rounded-full bg-white/15 p-5">
        <Mascot size={72} />
      </div>
      <div className="text-center">
        <div className="text-[26px] font-bold leading-tight">말하는 지도</div>
        <div className="text-[15px] font-medium opacity-90 mt-1">우리 아이 등굣길</div>
      </div>
      <p className="text-[13px] opacity-80 text-center leading-relaxed px-10">사진 한 장으로 신고하면<br />고쳐질 때까지 알려 드려요</p>
      <div className="absolute bottom-10 text-[11px] opacity-60">양주시 · 팀 지제가</div>
    </div>
  );
}
