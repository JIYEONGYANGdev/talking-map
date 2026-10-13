"use client";
import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";

/**
 * 서비스 주소(/)로 들어올 때마다 잠깐 보여주는 소개 화면. 1.6초 뒤 자동으로 사라지고 탭하면 바로 닫힌다.
 * 앱 안에서 탭을 오가는 동안은 다시 뜨지 않고(AppShell 이 한 번만 마운트), 진행 확인 링크(/reports/…)처럼 깊은 주소로 들어올 때도 띄우지 않는다.
 * 화면을 가리기만 하고 데이터 로딩은 뒤에서 그대로 진행된다.
 */
/** 스플래시 켜기/끄기. 시연 영상은 스플래시를 따로 녹화해 붙이기로 해서 10/13 부터 꺼 둔다(false 면 아무것도 그리지 않음) */
const SPLASH_ENABLED = false;
/** 시연 녹화용 스위치. true 면 자동으로 사라지지 않고 화면을 한 번 누를 때까지 떠 있다가 페이드아웃된다. 녹화가 끝나면 false 로 되돌린다 */
const HOLD_UNTIL_TAP = true;

export default function Splash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "fade">("hidden");
  useEffect(() => {
    if (!SPLASH_ENABLED || window.location.pathname !== "/") return;
    const done = () => setPhase("hidden");
    const t0 = setTimeout(() => setPhase("show"), 0);
    if (HOLD_UNTIL_TAP) return () => clearTimeout(t0);
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
    if (phase !== "show") return;
    setPhase("fade");
    setTimeout(() => setPhase("hidden"), 500);
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
