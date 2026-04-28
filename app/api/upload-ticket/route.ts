import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, ACTIVITY_BUCKET } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { canUseTicketsApp } from "@/lib/tickets-access";

const MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function resolveContentType(file: File): string | null {
  const t = (file.type || "").trim();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = ext && EXT_TO_MIME[ext] ? EXT_TO_MIME[ext] : null;
  if (t && t !== "application/octet-stream" && ALLOWED_TYPES.has(t)) return t;
  if (t === "application/octet-stream" || !t) return fromExt;
  if (fromExt) return fromExt;
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canUseTicketsApp(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  const contentType = resolveContentType(file);
  if (!contentType) return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filePath = `tickets/${session.user.id}/${randomUUID()}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(ACTIVITY_BUCKET)
    .upload(filePath, buffer, { contentType, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ACTIVITY_BUCKET}/${filePath}`;

  return NextResponse.json({ url, name: file.name, type: contentType, size: file.size });
}
