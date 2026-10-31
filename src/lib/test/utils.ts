import { render } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { Database } from '../database.types.js';

// Mock Supabase client for testing
export const createMockSupabaseClient = () => {
	const mockFrom = vi.fn(() => ({
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: vi.fn(),
		order: vi.fn().mockReturnThis()
	}));

	return {
		auth: {
			getUser: vi.fn(),
			getSession: vi.fn(),
			signInWithOAuth: vi.fn(),
			signInWithPassword: vi.fn(),
			signUp: vi.fn(),
			signOut: vi.fn(),
			onAuthStateChange: vi.fn(() => ({
				data: {
					subscription: {
						unsubscribe: vi.fn()
					}
				}
			}))
		},
		from: mockFrom
	};
};

// Helper for rendering Svelte components with context
export function renderWithContext(component: any, options: any = {}) {
	return render(component, {
		context: new Map([
			// Add any required context providers here
		]),
		...options
	});
}

// Helper to create mock user objects
export const createMockUser = (overrides: Partial<any> = {}) => ({
	id: '123e4567-e89b-12d3-a456-426614174000',
	aud: 'authenticated',
	email: 'test@example.com',
	app_metadata: {
		provider: 'email',
		providers: ['email'],
		...overrides.app_metadata
	},
	user_metadata: {
		full_name: 'Test User',
		avatar_url: null,
		...overrides.user_metadata
	},
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
	email_confirmed_at: new Date().toISOString(),
	phone_confirmed_at: undefined,
	confirmation_sent_at: undefined,
	recovery_sent_at: undefined,
	email_change_sent_at: undefined,
	new_email: undefined,
	invited_at: undefined,
	action_link: undefined,
	email_change: undefined,
	phone: undefined,
	phone_change: undefined,
	phone_change_sent_at: undefined,
	confirmed_at: new Date().toISOString(),
	last_sign_in_at: new Date().toISOString(),
	role: 'authenticated',
	...overrides
});

// Helper to create mock session objects
export const createMockSession = (user?: any) => ({
	access_token: 'mock_access_token',
	refresh_token: 'mock_refresh_token',
	expires_in: 3600,
	expires_at: Math.floor(Date.now() / 1000) + 3600,
	token_type: 'bearer' as const,
	provider_token: undefined,
	provider_refresh_token: undefined,
	user: user || createMockUser()
});

// Helper to wait for async operations in tests
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));