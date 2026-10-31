import { createSupabaseServerClient } from '$lib/supabase.server.js';
import type { Handle } from '@sveltejs/kit';

// Cloudflare Pages applies `_headers` to static assets only, not to responses
// rendered by SvelteKit, so pages need their security headers set here.
// The rest of the CSP lives in the <meta> tag in app.html; only frame-ancestors
// is set here because it can't be delivered via <meta>.
const SECURITY_HEADERS: Record<string, string> = {
	'Content-Security-Policy': "frame-ancestors 'none'",
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies);

	// getSession() alone trusts the cookie payload without verifying the JWT.
	// Always re-validate by calling getUser() before treating the session as authenticated.
	// See https://supabase.com/docs/guides/auth/server-side/sveltekit
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(name, value);
	}

	return response;
};
