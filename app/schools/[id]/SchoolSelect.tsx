"use client";
import { useRouter } from "next/navigation";

export default function SchoolSelect({ schools, current }: { schools: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/schools/${e.target.value}`)}
      className="text-sm border rounded-lg px-2 py-1 bg-white"
    >
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
