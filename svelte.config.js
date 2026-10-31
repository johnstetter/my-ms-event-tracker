import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Configure for Cloudflare Pages deployment
		adapter: adapter({
			// Configure build output
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		// Handle client-side routing
		prerender: {
			handleHttpError: 'warn'
		}
	}
};

export default config;
