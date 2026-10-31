import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build metadata shown in the footer. GitHub Actions provides GITHUB_* on
// every step; local builds fall back to git and are labelled "dev".
function gitCommit(): string {
	try {
		return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return '';
	}
}

const buildInfo = {
	commit: process.env.GITHUB_SHA || gitCommit(),
	runNumber: process.env.GITHUB_RUN_NUMBER || '',
	repository: process.env.GITHUB_REPOSITORY || '',
	builtAt: new Date().toISOString()
};

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_INFO__: JSON.stringify(buildInfo)
	},
	server: {
		port: 5273,
		strictPort: true
	}
});
