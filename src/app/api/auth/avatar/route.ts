import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ avatarUrl: null }, { status: 401 });

  return NextResponse.json(
    { avatarUrl: user.avatarUrl },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
