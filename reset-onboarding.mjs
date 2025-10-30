// Reset onboarding for the user
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetOnboarding() {
  console.log('🔄 Resetting onboarding for user: jonbrookings@gmail.com\n');
  
  // First, check the current state
  const { data: before, error: fetchError } = await supabase
    .from('profiles')
    .select('email, onboarding_completed, full_name, height_cm, weight_kg, activity_level')
    .eq('email', 'jonbrookings@gmail.com')
    .single();
    
  if (fetchError) {
    console.error('❌ Error fetching profile:', fetchError);
    process.exit(1);
  }
  
  console.log('📋 Current profile state:');
  console.log('  - Email:', before.email);
  console.log('  - Onboarding completed:', before.onboarding_completed);
  console.log('  - Full name:', before.full_name || '(not set)');
  console.log('  - Height:', before.height_cm ? `${before.height_cm} cm` : '(not set)');
  console.log('  - Weight:', before.weight_kg ? `${before.weight_kg} kg` : '(not set)');
  console.log('  - Activity level:', before.activity_level || '(not set)');
  
  // Reset the onboarding flag
  console.log('\n🔧 Resetting onboarding_completed flag...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: false,
      updated_at: new Date().toISOString()
    })
    .eq('email', 'jonbrookings@gmail.com');
    
  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
    process.exit(1);
  }
  
  // Verify the change
  const { data: after, error: verifyError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('email', 'jonbrookings@gmail.com')
    .single();
    
  if (verifyError) {
    console.error('❌ Error verifying update:', verifyError);
    process.exit(1);
  }
  
  console.log('✅ Successfully reset onboarding!');
  console.log('  - Onboarding completed:', after.onboarding_completed);
  console.log('\n📱 Next steps:');
  console.log('  1. Reload your app (shake phone → Reload)');
  console.log('  2. You should now see the onboarding screen with Synapse');
  console.log('  3. Answer all the questions naturally');
  console.log('  4. After completing, you will get the photo selection modal! 📸');
  console.log('  5. Choose: Take Selfie, Upload Photo, or Stay Anonymous\n');
}

resetOnboarding().catch(console.error);
