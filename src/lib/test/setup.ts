import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock browser environment
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock browser environment for Svelte/SvelteKit
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: 'test'
}));

// Mock window.location for test environment
Object.defineProperty(window, 'location', {
	value: {
		origin: 'http://localhost:5273',
		href: 'http://localhost:5273',
		hostname: 'localhost',
		port: '5273',
		protocol: 'http:',
		pathname: '/',
		search: '',
		hash: ''
	},
	writable: true
});

// Mock $app/stores
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({ url: new URL('http://localhost:5273'), params: {}, route: { id: null } });
			return vi.fn(); // unsubscribe
		})
	},
	navigating: {
		subscribe: vi.fn((callback) => {
			callback(null);
			return vi.fn();
		})
	},
	updated: {
		subscribe: vi.fn((callback) => {
			callback(false);
			return vi.fn();
		})
	}
}));