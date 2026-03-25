import { NextResponse } from "next/server";
import { getPacksForClient } from "@/lib/credits";

export async function GET() {
  return NextResponse.json({ packs: getPacksForClient() });
}
export { OPTIONS } from "@/lib/cors";
