import type { MarkerKind, Signal } from "./types";

/** 두 좌표 사이 거리(m) */
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** 공개 좌표는 소수점 4자리(≈10m)로 뭉갠다 */
export const roundCoord = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * 마커 색 규칙.
 * 점검 우선: confirmed 이고 같은 지점 50m 안에 confirmed/resolved 신호가 2건 이상
 * 처리 중: confirmed
 * 고쳐짐: resolved
 */
export function markerKind(s: Signal, all: Signal[]): MarkerKind {
  if (s.status === "resolved") return "resolved";
  if (s.lat == null || s.lng == null) return "inprogress";
  const near = all.filter(
    (o) =>
      o.id !== s.id &&
      o.lat != null &&
      o.lng != null &&
      (o.status === "confirmed" || o.status === "resolved") &&
      distanceM(s.lat!, s.lng!, o.lat, o.lng) <= 50,
  );
  return near.length >= 1 ? "priority" : "inprogress";
}

export const MARKER_LABEL: Record<MarkerKind, string> = {
  priority: "점검 우선",
  inprogress: "처리 중",
  resolved: "고쳐짐",
};
export const MARKER_COLOR: Record<MarkerKind, string> = {
  priority: "#c2410c", // 점검 우선 (globals.css --color-priority)
  inprogress: "#006ef4", // 처리 중 = 브랜드 파랑 (--color-progress)
  resolved: "#0f7b4f", // 고쳐짐 초록 (--color-done)
};
