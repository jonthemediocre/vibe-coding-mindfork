// List all profiles
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProfiles() {
  console.log('📋 Fetching all profiles...\n');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('email, onboarding_completed, full_name, created_at')
    .limit(10);
    
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('No profiles found');
    process.exit(0);
  }
  
  console.log('Found ' + data.length + ' profile(s):\n');
  data.forEach((profile, index) => {
    console.log((index + 1) + '. Email: ' + profile.email);
    console.log('   Name: ' + (profile.full_name || '(not set)'));
    console.log('   Onboarding completed: ' + profile.onboarding_completed);
    console.log('   Created: ' + profile.created_at);
    console.log('');
  });
}

listProfiles().catch(console.error);
