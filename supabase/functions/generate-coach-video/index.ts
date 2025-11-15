// Edge Function: generate-coach-video
// Generates personalized coach videos using HeyGen and ElevenLabs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper function to poll D-ID for video completion
async function pollDidCompletion(talkId: string, jobId: string, didKey: string, supabaseClient: any) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const response = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: {
          'Authorization': `Basic ${didKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`D-ID status check failed: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`[Poll ${attempts}] D-ID status:`, data.status);

      if (data.status === 'done' && data.result_url) {
        await supabaseClient.from('coach_video_jobs').update({
          status: 'completed',
          video_url: data.result_url
        }).eq('id', jobId);

        console.log(`✅ Video completed: ${data.result_url}`);
        return;
      } else if (data.status === 'error' || data.status === 'rejected') {
        await supabaseClient.from('coach_video_jobs').update({
          status: 'error',
          error_type: 'provider',
          error_message: data.error?.description || 'D-ID video generation failed'
        }).eq('id', jobId);

        console.error(`❌ D-ID generation failed:`, data.error);
        return;
      }
    } catch (error) {
      console.error(`D-ID poll attempt ${attempts} error:`, error);
    }
  }

  await supabaseClient.from('coach_video_jobs').update({
    status: 'error',
    error_type: 'timeout',
    error_message: 'Video generation timed out after 5 minutes'
  }).eq('id', jobId);

  console.error(`⏰ D-ID polling timed out for job ${jobId}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const heygenKey = Deno.env.get('HEYGEN_API_KEY');
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    const didKey = Deno.env.get('DID_API_KEY');

    if (!elevenLabsKey) {
      throw new Error('ElevenLabs API key not found in environment');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, coachName, message, avatarId, voiceId, jobId, provider, avatarImageUrl } = await req.json();

    // Fetch coach's voice ID from database if not provided
    let finalVoiceId = voiceId;
    if (!finalVoiceId && coachName) {
      const { data: coachData } = await supabaseClient
        .from('coaches')
        .select('elevenlabs_voice_id')
        .eq('name', coachName)
        .single();

      if (coachData?.elevenlabs_voice_id) {
        finalVoiceId = coachData.elevenlabs_voice_id;
        console.log(`[Voice] Using voice from database for ${coachName}: ${finalVoiceId}`);
      }
    }

    let videoProvider = provider || 'did';

    if (videoProvider === 'auto') {
      videoProvider = 'did';
    }

    if (!['heygen', 'did'].includes(videoProvider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be "heygen", "did", or "auto"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (videoProvider === 'heygen' && !heygenKey) {
      throw new Error('HeyGen API key not found in environment');
    }

    if (videoProvider === 'did' && !didKey) {
      throw new Error('D-ID API key not found in environment');
    }

    if (!userId || !coachName || !message || !jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, coachName, message, jobId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId || 'EXAVITQu4vr4xnSDxMaL'}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!voiceResponse.ok) {
      throw new Error(`ElevenLabs API error: ${voiceResponse.statusText}`);
    }

    const audioBlob = await voiceResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    const audioFileName = `${jobId}_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('coach-videos')
      .upload(`audio/${audioFileName}`, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('coach-videos')
      .getPublicUrl(`audio/${audioFileName}`);

    let videoResponse;
    let videoData;
    let videoId;
    let videoUrl;

    if (videoProvider === 'heygen') {
      videoResponse = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'x-api-key': heygenKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_inputs: [{
            character: {
              type: 'avatar',
              avatar_id: avatarId || 'Abigail_expressive_2024112501'
            },
            voice: {
              type: 'audio',
              audio_url: publicUrl
            }
          }],
          dimension: {
            width: 1080,
            height: 1920
          }
        })
      });

      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('HeyGen API error details:', errorText);
        throw new Error(`HeyGen API error: ${videoResponse.statusText} - ${errorText}`);
      }

      videoData = await videoResponse.json();
      videoId = videoData.data?.video_id;
      videoUrl = videoData.data?.video_url;
    } else if (videoProvider === 'did') {
      // Map coach names to their avatar images (ALL HUMAN PHOTOS)
      const coachImageMap: Record<string, string> = {
        'Nora': 'nora-human.png',
        'Blaze': 'blaze-human.png',
        'Kai': 'kai-human.png',
        'Maya': 'maya_human.png',
        'Sato': 'Sato_human.png'
      };

      const imageFilename = coachImageMap[coachName] || 'coach_decibel.png';
      const defaultSourceUrl = `https://lxajnrofkgpwdpodjvkm.supabase.co/storage/v1/object/public/coach-avatars/${imageFilename}`;

      console.log(`[D-ID] Using image for ${coachName}: ${defaultSourceUrl}`);

      videoResponse = await fetch('https://api.d-id.com/talks', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${didKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_url: avatarImageUrl || defaultSourceUrl,
          script: {
            type: 'audio',
            audio_url: publicUrl
          },
          config: {
            stitch: true,
            result_format: 'mp4',
            driver_url: 'bank://lively',
            pad_audio: 0.5
          }
        })
      });

      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('D-ID API error details:', errorText);
        throw new Error(`D-ID API error: ${videoResponse.statusText} - ${errorText}`);
      }

      videoData = await videoResponse.json();
      videoId = videoData.id;
      videoUrl = videoData.result_url || null;
    }

    const { data: jobData, error: dbError } = await supabaseClient
      .from('coach_video_jobs')
      .update({
        status: 'generating',
        audio_url: publicUrl,
        video_url: videoUrl,
        provider: videoProvider,
        did_talk_id: videoId
      })
      .eq('id', jobId)
      .select()
      .maybeSingle();

    if (dbError) {
      console.error('Database error:', dbError);
      await supabaseClient.from('coach_video_jobs').update({
        status: 'error',
        error_type: 'database',
        error_message: dbError.message
      }).eq('id', jobId);
      throw dbError;
    }

    if (videoProvider === 'did' && videoId) {
      pollDidCompletion(videoId, jobId, didKey, supabaseClient).catch(err => {
        console.error('D-ID polling error:', err);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        provider: videoProvider,
        videoId: videoId,
        videoUrl: videoUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error generating coach video:', error);

    try {
      const { jobId } = await req.clone().json();
      if (jobId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseClient.from('coach_video_jobs').update({
          status: 'error',
          error_type: 'generation',
          error_message: error.message
        }).eq('id', jobId);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
