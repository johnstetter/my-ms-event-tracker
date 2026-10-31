import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './database.types.js';
import type { Cookies } from '@sveltejs/kit';

// Per-request server-side Supabase client. Reads/writes auth cookies via
// SvelteKit's `event.cookies` so the session round-trips between requests.
export function createSupabaseServerClient(cookies: Cookies) {
  return createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, { ...options, path: '/' });
          });
        },
      },
    }
  );
}
