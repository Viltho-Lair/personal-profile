import { NextResponse } from "next/server";
import { visitorCount } from "@/lib/visitors";

export const dynamic = "force-dynamic";

const reply = (count: number | null) => NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });

/** The count so far. */
export async function GET() {
  return reply(await visitorCount("read", process.env));
}

/** Counts a visit: each browser sends this once a day. */
export async function POST() {
  return reply(await visitorCount("count", process.env));
}
