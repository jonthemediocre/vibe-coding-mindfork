import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials for verify-food function.");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type VerificationPayload = {
  foodId: string;
  verifiedBy: string;
  isAccurate: boolean;
  correctedValues?: Record<string, unknown>;
  reason?: string;
  trustDelta?: number;
};

function jsonResponse(body: unknown, status = 200) {
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
    return jsonResponse(null, 200);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server configuration incomplete" }, 500);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: VerificationPayload;
  try {
    payload = (await req.json()) as VerificationPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!payload.foodId || !payload.verifiedBy || payload.isAccurate === undefined) {
    return jsonResponse({ error: "foodId, verifiedBy, and isAccurate are required" }, 400);
  }

  try {
    const { data: foodRecord, error: foodError } = await supabase
      .from("user_contributed_foods")
      .select("id, verification_count, trust_score")
      .eq("id", payload.foodId)
      .maybeSingle();

    if (foodError || !foodRecord) {
      return jsonResponse({ error: "Food record not found" }, 404);
    }

    const existingVerification = await supabase
      .from("nutrition_verifications")
      .select("id")
      .eq("food_id", payload.foodId)
      .eq("verified_by", payload.verifiedBy)
      .maybeSingle();

    if (existingVerification.error) {
      console.error("Failed to read existing verification:", existingVerification.error);
      return jsonResponse({ error: "Failed to record verification" }, 500);
    }

    let verificationInserted = false;

    if (existingVerification.data) {
      const updateVerification = await supabase
        .from("nutrition_verifications")
        .update({
          is_accurate: payload.isAccurate,
          corrected_values: payload.correctedValues ?? null,
          reason: payload.reason ?? null,
        })
        .eq("id", existingVerification.data.id);

      if (updateVerification.error) {
        console.error("Failed to update verification:", updateVerification.error);
        return jsonResponse({ error: "Failed to record verification" }, 500);
      }
    } else {
      const insertVerification = await supabase
        .from("nutrition_verifications")
        .insert({
          food_id: payload.foodId,
          verified_by: payload.verifiedBy,
          is_accurate: payload.isAccurate,
          corrected_values: payload.correctedValues ?? null,
          reason: payload.reason ?? null,
        });

      if (insertVerification.error) {
        console.error("Failed to insert verification:", insertVerification.error);
        return jsonResponse({ error: "Failed to record verification" }, 500);
      }

      verificationInserted = true;
    }

    const trustDelta = payload.trustDelta ?? (payload.isAccurate ? 3 : -5);
    const newTrustScore = Math.max(0, Math.min(100, Number(foodRecord.trust_score ?? 50) + trustDelta));

    const updateFields: Record<string, unknown> = {
      trust_score: newTrustScore,
      updated_at: new Date().toISOString(),
    };

    if (verificationInserted) {
      updateFields.verification_count = (foodRecord.verification_count ?? 0) + 1;
    }

    const updateFood = await supabase
      .from("user_contributed_foods")
      .update(updateFields)
      .eq("id", payload.foodId);

    if (updateFood.error) {
      console.error("Failed to update food:", updateFood.error);
      return jsonResponse({ error: "Failed to update food record" }, 500);
    }

    return jsonResponse({
      ok: true,
      foodId: payload.foodId,
      newTrustScore,
    });
  } catch (error) {
    console.error("verify-food unexpected error:", error);
    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
});
