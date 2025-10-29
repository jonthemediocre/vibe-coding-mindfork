// Temporary type override to bypass Supabase generated types issues
// These will be replaced with proper Supabase types once the database is set up
declare module '@supabase/supabase-js' {
  export * from '@supabase/supabase-js';
}
