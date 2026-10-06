import { getSchools } from "@/lib/db";

export async function GET() {
  const schools = await getSchools();
  return Response.json(schools);
}
