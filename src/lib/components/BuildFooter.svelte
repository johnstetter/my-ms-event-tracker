<script lang="ts">
	// Build metadata is injected at build time (see vite.config.ts) so the
	// running app can be matched to the commit and CI run that produced it.
	const info = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null;

	const shortSha = info?.commit ? info.commit.slice(0, 7) : 'unknown';
	const commitUrl =
		info?.commit && info.repository
			? `https://github.com/${info.repository}/commit/${info.commit}`
			: null;
	const label = info?.runNumber ? `Build #${info.runNumber}` : 'dev';
	const builtAt = info?.builtAt
		? info.builtAt.replace('T', ' ').slice(0, 16) + ' UTC'
		: '';
</script>

<footer class="build-footer">
	<span>{label}</span>
	<span aria-hidden="true">·</span>
	{#if commitUrl}
		<a href={commitUrl} target="_blank" rel="noopener noreferrer" title={info?.commit}>{shortSha}</a>
	{:else}
		<span title={info?.commit}>{shortSha}</span>
	{/if}
	{#if builtAt}
		<span aria-hidden="true">·</span>
		<time datetime={info?.builtAt}>{builtAt}</time>
	{/if}
</footer>

<style>
	.build-footer {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 1.5rem 1rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.build-footer a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: var(--color-border);
	}

	.build-footer a:hover {
		color: var(--color-text);
	}
</style>
