export const CATEGORIES = [
  "불법주정차",
  "횡단보도·신호등",
  "인도·도로 파손",
  "가로등·조명",
  "공사 구간",
  "통학버스·학교 출입구",
  "속도·교통량",
  "기타",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["received", "ai_proposed", "confirmed", "resolved", "dismissed"] as const;
export type Status = (typeof STATUSES)[number];

/** 학부모 화면에 보이는 상태 라벨 */
export const PUBLIC_STATUS: Record<Status, string> = {
  received: "접수",
  ai_proposed: "검토 중",
  confirmed: "처리 중",
  resolved: "고쳐짐",
  dismissed: "확인 결과 이상 없음",
};

export type School = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  district: "옥정" | "회천" | "기존시가지";
  sample?: boolean; // 공공데이터 적재 전 임시값
};

export type Zone = {
  id: string;
  name: string; // 대상시설명
  lat: number;
  lng: number;
  cctv: boolean;
  roadWidth?: string;
  police?: string;
};

export type Agency = {
  id: string;
  name: string;
  handles: Category[];
  legalBasis: string;
};

export type Report = {
  id: string;
  token: string; // 학부모 추적용
  source: "form" | "mms" | "safetyreport" | "mock";
  receivedAt: string;
  rawText: string;
  maskedText: string;
  photoUrl?: string;
  rawAddress?: string;
  lat?: number; // 신고 폼에서 지도 탭으로 지정
  lng?: number;
};

export type Signal = {
  id: string;
  reportId: string;
  schoolId: string | null;
  category: Category;
  lat: number | null;
  lng: number | null;
  locationConfidence: "high" | "mid" | "low";
  agencyId: string | null;
  legalBasis: string | null;
  aiSummary: string;
  aiReason: string;
  status: Status;
  confirmedAt?: string;
  resolvedAt?: string;
  updatedAt: string;
};

/** 지도 마커 색 규칙: 점검 우선(주황) / 처리 중(파랑) / 고쳐짐(초록) */
export type MarkerKind = "priority" | "inprogress" | "resolved";
