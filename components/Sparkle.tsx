/** AI 요약 리포트 표시용 반짝이 아이콘. 이모지 대신 SVG 라 기기마다 같은 모양으로 보인다 */
export default function Sparkle({ size = 16, className = "text-brand" }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5 14.1 9l6.4 2.1-6.4 2.1L12 19.5l-2.1-6.3L3.5 11.1 9.9 9z" />
      <path d="M19 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" opacity=".8" />
      <path d="M5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7z" opacity=".7" />
    </svg>
  );
}
