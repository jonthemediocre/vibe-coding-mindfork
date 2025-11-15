import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? Deno.env.get("ELEVEN_LABS_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STORAGE_BUCKET = Deno.env.get("VOICE_STORAGE_BUCKET") ?? "audio";

if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables for voice-speak function.");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type VoicePreset = {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
};

const VOICE_PRESETS: Record<string, VoicePreset> = {
  nora_gentle: {
    voiceId: Deno.env.get("ELEVENLABS_VOICE_NORA") ?? "",
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.35,
    useSpeakerBoost: true,
  },
  blaze_hype: {
    voiceId: Deno.env.get("ELEVENLABS_VOICE_BLAZE") ?? "",
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.75,
    useSpeakerBoost: true,
  },
  kai_planner: {
    voiceId: Deno.env.get("ELEVENLABS_VOICE_KAI") ?? "",
    stability: 0.65,
    similarityBoost: 0.7,
    style: 0.4,
    useSpeakerBoost: true,
  },
  sato_discipline: {
    voiceId: Deno.env.get("ELEVENLABS_VOICE_SATO") ?? "",
    stability: 0.8,
    similarityBoost: 0.65,
    style: 0.25,
    useSpeakerBoost: false,
  },
  maya_rival: {
    voiceId: Deno.env.get("ELEVENLABS_VOICE_MAYA") ?? "",
    stability: 0.6,
    similarityBoost: 0.78,
    style: 0.55,
    useSpeakerBoost: true,
  },
};

type VoiceRequest = {
  userId: string;
  coachId: string;
  text: string;
  coachingMode?: "default" | "roast" | "savage";
  durationHintSeconds?: number;
  makePublic?: boolean;
};

function allowCorsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: allowCorsHeaders(req.headers.get("origin") ?? "*") });
  }

  if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
    });
  }

  let payload: VoiceRequest;
  try {
    payload = (await req.json()) as VoiceRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
    });
  }

  if (!payload.text || !payload.coachId || !payload.userId) {
    return new Response(JSON.stringify({ error: "text, coachId, and userId are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
    });
  }

  const normalizedCoachId = payload.coachId.toLowerCase();
  const voicePreset = VOICE_PRESETS[normalizedCoachId];

  if (!voicePreset || !voicePreset.voiceId) {
    return new Response(JSON.stringify({ error: `Voice preset not configured for coachId: ${payload.coachId}` }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
    });
  }

  try {
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voicePreset.voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: payload.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: voicePreset.stability,
            similarity_boost: voicePreset.similarityBoost,
            style: voicePreset.style,
            use_speaker_boost: voicePreset.useSpeakerBoost,
          },
        }),
      },
    );

    if (!elevenResponse.ok) {
      const errText = await elevenResponse.text();
      console.error("ElevenLabs error response:", errText);
      return new Response(JSON.stringify({ error: "Failed to synthesize voice" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
      });
    }

    const audioArrayBuffer = await elevenResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);

    const userId = payload.userId;
    const fileKey = `voice/${userId}/${normalizedCoachId}/${Date.now()}.mp3`;

    const storageUpload = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileKey, audioBytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: "audio/mpeg",
      });

    if (storageUpload.error) {
      console.error("Supabase storage upload failed:", storageUpload.error);
      return new Response(JSON.stringify({ error: "Failed to store synthesized audio" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileKey);

    const audioUrl = publicUrlData?.publicUrl ?? null;

    if (audioUrl) {
      const insertResult = await supabase.from("voice_recordings").insert({
        user_id: userId,
        coach_id: normalizedCoachId,
        audio_url: audioUrl,
        transcript: payload.text,
        coaching_mode: payload.coachingMode ?? "default",
        duration_seconds: payload.durationHintSeconds ?? null,
        share_count: 0,
        is_public: payload.makePublic ?? false,
      });

      if (insertResult.error) {
        console.error("Failed to insert voice_recordings row:", insertResult.error);
      }
    }

    return new Response(
      JSON.stringify({
        audioUrl,
        bucket: STORAGE_BUCKET,
        path: fileKey,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
      },
    );
  } catch (error) {
    console.error("Unexpected error in voice-speak:", error);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...allowCorsHeaders(req.headers.get("origin") ?? "*") },
    });
  }
});
