import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client (full access for uploads)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client-side client (read public buckets)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const AVATAR_BUCKET = "avatars";
export const ACTIVITY_BUCKET = "activity-attachments";

export function getAvatarUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
