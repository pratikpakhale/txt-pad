import { put, list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const BLOB_PATHNAME = "notes.txt";
const PASSWORD = process.env.APP_PASSWORD!;

function checkAuth(req: NextRequest): boolean {
  const pw = req.headers.get("x-password");
  return pw === PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME });
    if (!blobs.length) return NextResponse.json({ text: "" });

    const res = await fetch(blobs[0].url);
    const text = await res.text();
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: "" });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();

  await put(BLOB_PATHNAME, text, {
    access: "public",
    allowOverwrite: true,
    contentType: "text/plain",
  });

  return NextResponse.json({ ok: true });
}
