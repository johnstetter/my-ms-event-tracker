// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types.js';

declare global {
	// Injected by vite.config.ts at build time
	const __BUILD_INFO__: {
		commit: string;
		runNumber: string;
		repository: string;
		builtAt: string;
	};

	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
