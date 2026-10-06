import { getSchools } from "@/lib/db";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const { school } = await searchParams;
  const schools = await getSchools();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">찍어 보내면, 고쳐질 때까지 알려 드려요</h1>
        <p className="text-sm text-zinc-600 mt-1">
          종류를 고를 필요 없습니다. 사진과 한 줄이면 AI가 정리하고 담당 기관을 제안합니다. 실제 서비스에서는 시장
          직통 문자(MMS)나 안전신문고로 보내면 되고, 이 폼은 그 대역입니다.
        </p>
      </div>
      <ReportForm schools={schools} defaultSchoolId={school ?? schools[0]?.id ?? ""} />
    </div>
  );
}
