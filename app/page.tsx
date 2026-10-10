import { Suspense } from "react";
import { getSchools } from "@/lib/db";
import Home from "./Home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const schools = await getSchools();
  return (
    <Suspense fallback={<div className="px-5 pt-5"><div className="h-40 rounded-2xl bg-white/60 animate-pulse" /></div>}>
      <Home schools={schools} />
    </Suspense>
  );
}
