/**
 * Core Supabase Database Types
 * Base types and database structure
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Base Database interface structure
 * Individual table definitions are imported from domain-specific files
 */
export interface DatabaseBase {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
}
