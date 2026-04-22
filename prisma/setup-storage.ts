import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uspbkwltfsbedhazlrud.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase.storage.createBucket("avatars", {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (error && error.message !== "The resource already exists") {
    console.error("Error creating bucket:", error.message);
    return;
  }

  console.log("Storage bucket 'avatars' is ready.", data);
}

main().catch(console.error);
