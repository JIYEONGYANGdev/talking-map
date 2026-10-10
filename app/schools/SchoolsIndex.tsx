"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SchoolPicker from "@/components/SchoolPicker";
import { useSchoolId } from "@/lib/local";
import type { School } from "@/lib/types";

export default function SchoolsIndex({ schools }: { schools: School[] }) {
  const router = useRouter();
  const [schoolId, setSchoolId, ready] = useSchoolId();
  const known = schools.some((s) => s.id === schoolId);
  useEffect(() => {
    if (ready && schoolId && known) router.replace(`/schools/${schoolId}`);
  }, [ready, schoolId, known, router]);
  if (!ready || (schoolId && known)) return <div className="px-5 pt-5"><div className="h-[380px] rounded-[20px] bg-white/60 animate-pulse" /></div>;
  return (
    <SchoolPicker
      schools={schools}
      title="어느 학교 주변을 볼까요?"
      onPick={(id) => {
        setSchoolId(id);
        router.push(`/schools/${id}`);
      }}
    />
  );
}
