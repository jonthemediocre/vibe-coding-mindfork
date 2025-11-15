import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for app-version-sync function.");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type VersionPayload = {
  userId: string;
  appVersion: string;
  platform: "ios" | "android" | "web";
  deviceModel?: string;
  osVersion?: string;
  buildNumber?: string;
};

const ALLOWED_PLATFORMS = new Set(["ios", "android", "web"]);

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return response(null, 200);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response({ error: "Server configuration incomplete" }, 500);
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  let payload: VersionPayload;
  try {
    payload = (await req.json()) as VersionPayload;
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  if (!payload.userId || !payload.appVersion || !payload.platform) {
    return response({ error: "userId, appVersion, and platform are required" }, 400);
  }

  if (!ALLOWED_PLATFORMS.has(payload.platform)) {
    return response({ error: `Unsupported platform: ${payload.platform}` }, 400);
  }

  try {
    const now = new Date().toISOString();

    const updateProfile = await supabase
      .from("profiles")
      .update({
        app_version: payload.appVersion,
        last_app_version_update: now,
        platform: payload.platform,
        device_model: payload.deviceModel ?? null,
        os_version: payload.osVersion ?? null,
      })
      .eq("user_id", payload.userId);

    if (updateProfile.error) {
      console.error("profiles update error:", updateProfile.error);
      return response({ error: "Failed to update profile" }, 500);
    }

    const existingVersion = await supabase
      .from("user_app_versions")
      .select("id, first_seen_at")
      .eq("user_id", payload.userId)
      .eq("app_version", payload.appVersion)
      .eq("platform", payload.platform)
      .maybeSingle();

    if (existingVersion.error) {
      console.error("user_app_versions select error:", existingVersion.error);
      return response({ error: "Failed to read version history" }, 500);
    }

    if (existingVersion.data) {
      const updateVersion = await supabase
        .from("user_app_versions")
        .update({
          device_model: payload.deviceModel ?? null,
          os_version: payload.osVersion ?? null,
          last_seen_at: now,
        })
        .eq("id", existingVersion.data.id);

      if (updateVersion.error) {
        console.error("user_app_versions update error:", updateVersion.error);
        return response({ error: "Failed to update version history" }, 500);
      }
    } else {
      const insertVersion = await supabase
        .from("user_app_versions")
        .insert({
          user_id: payload.userId,
          app_version: payload.appVersion,
          platform: payload.platform,
          device_model: payload.deviceModel ?? null,
          os_version: payload.osVersion ?? null,
          first_seen_at: now,
          last_seen_at: now,
        });

      if (insertVersion.error) {
        console.error("user_app_versions insert error:", insertVersion.error);
        return response({ error: "Failed to insert version history" }, 500);
      }
    }

    return response({
      ok: true,
      userId: payload.userId,
      appVersion: payload.appVersion,
      platform: payload.platform,
    });
  } catch (error) {
    console.error("app-version-sync unexpected error:", error);
    return response({ error: "Unexpected server error" }, 500);
  }
});
