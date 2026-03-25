import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, userResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return NextResponse.json({ user: userResponse(user) });
}
export { OPTIONS } from "@/lib/cors";
