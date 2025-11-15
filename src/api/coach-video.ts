/**
 * Coach Video Generation API
 *
 * Supports two providers:
 * - HeyGen: High-quality video generation (requires custom avatar upload)
 * - D-ID: Fast, cheaper video generation (uses image URLs directly)
 */

import { supabase } from './supabase'

export type VideoProvider = 'heygen' | 'did'

export interface GenerateVideoOptions {
  coachId: string
  message: string
  userId: string
  provider?: VideoProvider  // Defaults to 'did'
  avatarId?: string         // For HeyGen (optional)
  avatarImageUrl?: string   // For D-ID (optional, uses default coach image)
  voiceId?: string          // For ElevenLabs (optional)
}

export interface VideoJob {
  id: string
  status: 'pending' | 'generating' | 'completed' | 'error'
  audio_url?: string
  video_url?: string
  provider?: string
  error_message?: string
  created_at: string
}

/**
 * Generate a coach video using HeyGen or D-ID
 *
 * @example
 * // Test with D-ID (default, faster, cheaper)
 * const jobId = await generateCoachVideo({
 *   coachId: 'nora_gentle',
 *   message: 'Great work today!',
 *   userId: user.id,
 *   provider: 'did'
 * })
 *
 * @example
 * // Test with HeyGen (requires custom avatar)
 * const jobId = await generateCoachVideo({
 *   coachId: 'blaze_hype',
 *   message: 'You crushed it!',
 *   userId: user.id,
 *   provider: 'heygen',
 *   avatarId: 'your_heygen_avatar_id'
 * })
 */
export async function generateCoachVideo(options: GenerateVideoOptions): Promise<string> {
  const {
    coachId,
    message,
    userId,
    provider = 'did',
    avatarId,
    avatarImageUrl,
    voiceId
  } = options

  // 1. Get coach data
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('name, heygen_avatar_id, elevenlabs_voice_id, avatar_url')
    .eq('id', coachId)
    .maybeSingle()

  if (coachError || !coach) {
    throw new Error(`Coach not found: ${coachId}`)
  }

  // 2. Create job
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const { error: jobError } = await supabase
    .from('coach_video_jobs')
    .insert({
      id: jobId,
      user_id: userId,
      coach_name: coach.name,
      message_text: message,
      status: 'pending'
    })

  if (jobError) {
    throw new Error(`Failed to create job: ${jobError.message}`)
  }

  // 3. Generate video
  const { data, error } = await supabase.functions.invoke('generate-coach-video', {
    body: {
      userId,
      coachName: coach.name,
      message,
      jobId,
      provider,
      avatarId: avatarId || coach.heygen_avatar_id,
      avatarImageUrl: avatarImageUrl || coach.avatar_url,
      voiceId: voiceId || coach.elevenlabs_voice_id
    }
  })

  if (error) {
    throw new Error(`Video generation failed: ${error.message}`)
  }

  console.log(`✅ Video generation started with ${provider}:`, data)

  return jobId
}

/**
 * Poll for video completion
 *
 * @example
 * const jobId = await generateCoachVideo({ ... })
 * const video = await pollVideoStatus(jobId)
 * console.log('Video ready:', video.video_url)
 */
export async function pollVideoStatus(
  jobId: string,
  options?: {
    interval?: number  // Default: 3000ms
    timeout?: number   // Default: 120000ms (2 minutes)
  }
): Promise<VideoJob> {
  const interval = options?.interval || 3000
  const timeout = options?.timeout || 120000
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const checkStatus = setInterval(async () => {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(checkStatus)
        reject(new Error('Video generation timeout'))
        return
      }

      // Check job status
      const { data: job, error } = await supabase
        .from('coach_video_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()

      if (error) {
        clearInterval(checkStatus)
        reject(error)
        return
      }

      if (job.status === 'completed') {
        clearInterval(checkStatus)
        resolve(job as VideoJob)
      } else if (job.status === 'error') {
        clearInterval(checkStatus)
        reject(new Error(job.error_message || 'Video generation failed'))
      }
    }, interval)
  })
}

/**
 * Easy one-liner for testing both providers
 *
 * @example
 * // Test D-ID
 * const video = await testProviderComparison('nora_gentle', 'Hello!', user.id, 'did')
 *
 * // Test HeyGen
 * const video = await testProviderComparison('nora_gentle', 'Hello!', user.id, 'heygen')
 */
export async function testProviderComparison(
  coachId: string,
  message: string,
  userId: string,
  provider: VideoProvider
): Promise<VideoJob> {
  console.log(`🧪 Testing ${provider.toUpperCase()} provider...`)
  const jobId = await generateCoachVideo({
    coachId,
    message,
    userId,
    provider
  })
  console.log(`⏳ Waiting for video (jobId: ${jobId})...`)
  const video = await pollVideoStatus(jobId)
  console.log(`✅ ${provider.toUpperCase()} video ready:`, video.video_url)
  return video
}
