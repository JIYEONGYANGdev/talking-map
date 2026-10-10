"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MARKER_COLOR, MARKER_LABEL } from "@/lib/geo";
import type { Accident, MarkerKind, Zone } from "@/lib/types";

export type MapSignal = {
  id: string;
  category: string;
  lat: number | null;
  lng: number | null;
  kind: MarkerKind;
  summary: string;
  status: string;
};

type Props = {
  center: { lat: number; lng: number; name: string };
  radiusM?: number;
  signals?: MapSignal[];
  zones?: Zone[];
  /** 어린이보호구역 내 사고다발지역(도로교통공단). 비어 있으면 레이어 없음 */
  accidents?: Accident[];
  /** 신고 폼: 탭한 위치를 돌려준다 */
  onPick?: (p: { lat: number; lng: number }) => void;
  picked?: { lat: number; lng: number } | null;
  height?: number;
  /** 확대·축소 버튼 위치. 지도 위에 칩을 올리는 화면은 오른쪽 아래가 안 가린다 */
  zoomPosition?: L.ControlPosition;
};

export default function SchoolMap({ center, radiusM = 500, signals = [], zones = [], accidents = [], onPick, picked, height = 380, zoomPosition = "bottomright" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false }).setView([center.lat, center.lng], 16);
    L.control.zoom({ position: zoomPosition }).addTo(map.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    if (onPick) {
      map.current.on("click", (e: L.LeafletMouseEvent) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    }
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.setView([center.lat, center.lng]);
  }, [center.lat, center.lng]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    // 학교 + 반경
    L.circle([center.lat, center.lng], { radius: radiusM, color: "#999", weight: 1, fillOpacity: 0.04 }).addTo(g);
    L.circleMarker([center.lat, center.lng], { radius: 8, color: "#111", fillColor: "#fff", fillOpacity: 1, weight: 2 })
      .bindTooltip(center.name, { permanent: true, direction: "top", offset: [0, -8] })
      .addTo(g);
    // 어린이보호구역
    zones.forEach((z) =>
      L.circleMarker([z.lat, z.lng], { radius: 5, color: "#7c3aed", fillColor: "#c4b5fd", fillOpacity: 0.9, weight: 1 })
        .bindPopup(`<b>어린이보호구역</b><br/>${z.name}${z.cctv ? "<br/>CCTV 있음" : ""}`)
        .addTo(g),
    );
    // 사고다발지역: 붉은 테두리 원, 크기는 사고 건수에 비례(최소 10 ~ 최대 22px)
    accidents.forEach((a) =>
      L.circleMarker([a.lat, a.lng], {
        radius: Math.min(22, 10 + a.accidents * 2),
        color: "#b91c1c",
        weight: 2,
        dashArray: "3 3",
        fillColor: "#fecaca",
        fillOpacity: 0.35,
      })
        .bindPopup(`<b>어린이 사고다발지역</b> (${a.year})<br/>${a.name}<br/>사고 ${a.accidents}건 · 사상자 ${a.casualties}명`)
        .addTo(g),
    );
    // 신호
    signals.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      L.circleMarker([s.lat, s.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: MARKER_COLOR[s.kind],
        fillOpacity: 0.95,
      })
        .bindPopup(`<b>${MARKER_LABEL[s.kind]}</b> · ${s.category}<br/>${s.summary}`)
        .addTo(g);
    });
  }, [signals, zones, accidents, center, radiusM]);

  useEffect(() => {
    if (!map.current) return;
    pickRef.current?.remove();
    pickRef.current = null;
    if (picked) {
      pickRef.current = L.marker([picked.lat, picked.lng], {
        icon: L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#dc2626;border:2px solid #fff;box-shadow:0 0 0 2px #dc2626"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      }).addTo(map.current);
    }
  }, [picked]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden" />;
}
