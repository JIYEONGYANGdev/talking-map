"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapSignal } from "@/components/SchoolMap";
import type { School, Zone } from "@/lib/types";
import { MARKER_LABEL } from "@/lib/geo";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

type Data = { school: School; radiusM: number; signals: MapSignal[]; reviewing: number; zones: Zone[] };

export default function SchoolMapClient({ schoolId }: { schoolId: string }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    fetch(`/api/schools/${schoolId}/signals`).then((r) => r.json()).then(setData);
  }, [schoolId]);
  if (!data) return <div className="h-[380px] rounded-xl bg-zinc-100 animate-pulse" />;
  const counts = { priority: 0, inprogress: 0, resolved: 0 };
  data.signals.forEach((s) => counts[s.kind]++);
  return (
    <div className="space-y-3">
      <SchoolMap
        center={{ lat: data.school.lat, lng: data.school.lng, name: data.school.name }}
        radiusM={data.radiusM}
        signals={data.signals}
        zones={data.zones}
      />
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <Stat n={counts.priority} label={MARKER_LABEL.priority} c="text-orange-600" />
        <Stat n={counts.inprogress} label={MARKER_LABEL.inprogress} c="text-blue-700" />
        <Stat n={counts.resolved} label={MARKER_LABEL.resolved} c="text-green-700" />
        <Stat n={data.reviewing} label="검토 중" c="text-zinc-500" />
      </div>
      {data.signals.length > 0 && (
        <ul className="divide-y bg-white rounded-xl border border-zinc-200 text-sm">
          {data.signals.map((s) => (
            <li key={s.id} className="px-3 py-2 flex gap-2">
              <span className="shrink-0 text-xs rounded px-1.5 py-0.5 bg-zinc-100">{MARKER_LABEL[s.kind]}</span>
              <span className="text-zinc-500 shrink-0">{s.category}</span>
              <span>{s.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ n, label, c }: { n: number; label: string; c: string }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 py-2">
      <div className={`text-xl font-semibold ${c}`}>{n}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
