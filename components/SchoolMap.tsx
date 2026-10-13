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
  height?: number | string;
  /** 확대·축소 버튼 위치. 지도 위에 칩을 올리는 화면은 오른쪽 아래가 안 가린다 */
  zoomPosition?: L.ControlPosition;
  /** 바뀔 때마다 그 위치로 날아가고, id 가 있으면 그 마커의 말풍선을 연다. n 은 같은 위치를 다시 눌러도 반응하게 하는 카운터 */
  focus?: { lat: number; lng: number; id?: string; zoom?: number; n: number } | null;
  /** 사용자가 지도를 움직인 뒤의 중심. "현재 보고 있는 위치에서 가장 가까운 것" 계산에 쓴다 */
  onViewChange?: (center: { lat: number; lng: number }) => void;
};

export default function SchoolMap({ center, radiusM = 500, signals = [], zones = [], accidents = [], onPick, picked, height = 380, zoomPosition = "bottomright", focus, onViewChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef<L.Marker | null>(null);
  const markers = useRef<Map<string, L.CircleMarker>>(new Map());
  const viewCb = useRef(onViewChange);
  useEffect(() => {
    viewCb.current = onViewChange;
  }, [onViewChange]);

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
    map.current.on("moveend", () => {
      const c = map.current?.getCenter();
      if (c) viewCb.current?.({ lat: c.lat, lng: c.lng });
    });
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
    markers.current.clear();
    // 학교 + 반경
    L.circle([center.lat, center.lng], { radius: radiusM, color: "#999", weight: 1, fillOpacity: 0.04 }).addTo(g);
    L.circleMarker([center.lat, center.lng], { radius: 8, color: "#111", fillColor: "#fff", fillOpacity: 1, weight: 2 })
      .bindTooltip(center.name, { permanent: true, direction: "top", offset: [0, -8] })
      .addTo(g);
    // 어린이보호구역
    zones.forEach((z) => {
      const m = L.circleMarker([z.lat, z.lng], { radius: 5, color: "#1b4383", fillColor: "#d3deec", fillOpacity: 0.95, weight: 1.2 })
        .bindPopup(`<b>어린이보호구역</b><br/>${z.name}${z.cctv ? "<br/>CCTV 있음" : ""}`)
        .addTo(g);
      markers.current.set(`zone:${z.id}`, m);
    });
    // 사고다발지역: 붉은 테두리 원, 크기는 사고 건수에 비례(최소 10 ~ 최대 22px)
    accidents.forEach((a) => {
      const m = L.circleMarker([a.lat, a.lng], {
        radius: Math.min(22, 10 + a.accidents * 2),
        color: "#c2410c",
        weight: 2,
        dashArray: "3 3",
        fillColor: "#fff4ec",
        fillOpacity: 0.35,
      })
        .bindPopup(`<b>어린이 사고다발지역</b> (${a.year})<br/>${a.name}<br/>사고 ${a.accidents}건 · 사상자 ${a.casualties}명`)
        .addTo(g);
      markers.current.set(`accident:${a.id}`, m);
    });
    // 신호
    signals.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const m = L.circleMarker([s.lat, s.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: MARKER_COLOR[s.kind],
        fillOpacity: 0.95,
      })
        .bindPopup(`<b>${MARKER_LABEL[s.kind]}</b> · ${s.category}<br/>${s.summary}`)
        .addTo(g);
      // 점을 누르면 그 위치를 화면 가운데로 (말풍선은 Leaflet 이 기본으로 연다)
      m.on("click", () => {
        map.current?.closePopup();
        map.current?.panTo([s.lat!, s.lng!], { animate: true });
        m.openPopup();
      });
      markers.current.set(`signal:${s.id}`, m);
    });
    // center 는 부모가 매 렌더마다 새 객체로 만들 수 있으므로 값으로 비교한다 (안 그러면 지도를 움직일 때마다 마커가 다시 그려져 말풍선이 닫힌다)
  }, [signals, zones, accidents, center.lat, center.lng, center.name, radiusM]);

  // focus 가 바뀌면 그 위치로 날아가고 말풍선을 연다
  useEffect(() => {
    const mp = map.current;
    if (!mp || !focus) return;
    mp.closePopup(); // 말풍선은 한 번에 하나만. 이동 전에 열려 있던 것을 닫는다
    const zoom = focus.zoom ?? Math.max(mp.getZoom(), 17);
    mp.flyTo([focus.lat, focus.lng], zoom, { duration: 0.6 });
    const open = () => {
      // 마커를 화면에서 조금 아래로 내려 말풍선이 위쪽 칩에 가리지 않게 한다
      mp.panBy([0, -90], { animate: false });
      if (focus.id) markers.current.get(focus.id)?.openPopup();
    };
    mp.once("moveend", open);
    return () => {
      mp.off("moveend", open);
    };
  }, [focus]);

  useEffect(() => {
    if (!map.current) return;
    pickRef.current?.remove();
    pickRef.current = null;
    if (picked) {
      pickRef.current = L.marker([picked.lat, picked.lng], {
        icon: L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#c2410c;border:2px solid #fff;box-shadow:0 0 0 2px #c2410c"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      }).addTo(map.current);
    }
  }, [picked]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden" />;
}
