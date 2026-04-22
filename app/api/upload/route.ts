import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, AVATAR_BUCKET } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filePath = `${session.user.id}/avatar.${ext}`;

  const buffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${filePath}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  await logAudit(
    session.user.id,
    session.user.name,
    "avatar.upload",
    "Uploaded a new profile photo"
  );

  return NextResponse.json({ avatarUrl });
}
