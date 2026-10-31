import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'happy-dom',
		setupFiles: ['src/lib/test/setup.ts'],
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/lib/test/',
				'**/*.d.ts',
				'**/*.config.*',
				'src/lib/database.types.ts', // Exclude auto-generated types
				'build/',
				'.svelte-kit/'
			],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70
			}
		}
	}
});