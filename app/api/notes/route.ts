import { put, list, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

function slugify(username: string) {
  return username.toLowerCase().replace(/[^a-z0-9-_]/g, "");
}

export async function GET(req: NextRequest) {
  const user = req.nextUrl.searchParams.get("user");
  if (!user) return NextResponse.json({ error: "Missing user" }, { status: 400 });

  const key = `notes/${slugify(user)}.enc`;
  try {
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) return NextResponse.json({ data: null });
    const res = await fetch(blobs[0].url);
    const data = await res.text();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function POST(req: NextRequest) {
  const { user, data } = await req.json();
  if (!user || data === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const key = `notes/${slugify(user)}.enc`;

  // Delete old blob first
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length) await del(blobs.map((b) => b.url));
  } catch {}

  await put(key, data, {
    access: "public",
    contentType: "text/plain",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { user } = await req.json();
  if (!user) return NextResponse.json({ error: "Missing user" }, { status: 400 });

  const key = `notes/${slugify(user)}.enc`;
  try {
    const { blobs } = await list({ prefix: key });
    if (blobs.length) await del(blobs.map((b) => b.url));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
