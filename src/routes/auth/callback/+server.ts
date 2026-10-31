import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const nextRaw = url.searchParams.get('next') ?? '/';

	// Restrict redirect to same-origin paths. `?next=https://evil.com` and
	// protocol-relative `?next=//evil.com` are common phishing vectors after
	// OAuth flows.
	const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';

	if (!code) {
		throw redirect(303, '/?auth_error=missing_code');
	}

	const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error) {
		throw redirect(303, '/?auth_error=' + encodeURIComponent(error.message));
	}

	throw redirect(303, next);
};
