import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './database.types.js';

// Type aliases for easier use throughout the application
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Specific table types for convenient importing
export type Event = Tables<'events'>;
export type EventType = Tables<'event_types'>;
export type BodyLocation = Tables<'body_locations'>;
export type Intervention = Tables<'interventions'>;
export type EventLocation = Tables<'event_locations'>;
export type EventIntervention = Tables<'event_interventions'>;
export type EventNote = Tables<'event_notes'>;
export type ApiKey = Tables<'api_keys'>;

// Insert types for creating new records
export type NewEvent = TablesInsert<'events'>;
export type NewEventType = TablesInsert<'event_types'>;
export type NewBodyLocation = TablesInsert<'body_locations'>;
export type NewIntervention = TablesInsert<'interventions'>;
export type NewEventNote = TablesInsert<'event_notes'>;

// Event with related data (useful for queries with joins)
export type EventWithDetails = Event & {
  event_type?: EventType;
  event_locations?: (EventLocation & { body_location: BodyLocation })[];
  event_interventions?: (EventIntervention & { intervention: Intervention })[];
  event_notes?: EventNote[];
};

// Browser-side Supabase client. Uses cookies (via @supabase/ssr) so the
// server can read the same session in hooks.server.ts.
export const supabase = createBrowserClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// Helper function to check if user is authenticated
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper function for signing out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  }
  return error;
}
