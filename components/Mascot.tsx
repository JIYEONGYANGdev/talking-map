/**
 * 캐릭터 "핀이" — 지도 핀 모양. 빈 상태·안내 문구 옆에만 두고 데이터 위에는 올리지 않는다.
 * mood: 기본(미소) / priority(걱정, 주황) / progress(담담, 파랑)
 */
export default function Mascot({ size = 72, mood = "default" }: { size?: number; mood?: "default" | "priority" | "progress" }) {
  const fill = mood === "priority" ? "#C2410C" : mood === "progress" ? "#1B4383" : "#006EF4";
  const face = mood === "priority" ? "#FFF4EC" : mood === "progress" ? "#EEF4FE" : "#F6F8FB";
  const mouth = mood === "priority" ? "M31 46 q9 -5 18 0" : mood === "progress" ? "M31 44 h18" : "M32 43 q8 7 16 0";
  return (
    <svg viewBox="0 0 80 96" width={size} height={Math.round(size * 1.2)} aria-hidden="true" style={{ flex: "none" }}>
      <path d="M40 92 C 20 66, 6 50, 6 34 a34 34 0 1 1 68 0 c0 16-14 32-34 58z" fill={fill} />
      <circle cx="40" cy="36" r="24" fill={face} />
      <circle cx="31" cy="34" r="3" fill="#1F2D3A" />
      <circle cx="49" cy="34" r="3" fill="#1F2D3A" />
      <path d={mouth} stroke="#1F2D3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {mood === "default" && (
        <>
          <circle cx="25" cy="41" r="3.5" fill="#F5C2B3" />
          <circle cx="55" cy="41" r="3.5" fill="#F5C2B3" />
        </>
      )}
    </svg>
  );
}
