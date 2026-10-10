import { getSchools } from "@/lib/db";
import Home from "./Home";

export const dynamic = "force-dynamic";

export default async function Page() {
  const schools = await getSchools();
  return <Home schools={schools} />;
}
