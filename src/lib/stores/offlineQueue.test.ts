import { describe, it, expect, beforeEach, vi } from 'vitest';

// Must be hoisted before importing the module under test — the module has
// top-level side effects that call createQuickEvent indirectly via processQueue.
vi.mock('$lib/services/eventService.js', () => ({
	createQuickEvent: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock('$lib/logging/index.js', () => {
	const mockLogger: any = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		withContext: vi.fn().mockReturnThis(),
		withUserId: vi.fn().mockReturnThis(),
		withRequestId: vi.fn().mockReturnThis()
	};
	return {
		createServiceLogger: vi.fn(() => mockLogger),
		createTimer: vi.fn(() => ({
			end: vi.fn(),
			error: vi.fn()
		}))
	};
});

import {
	offlineQueue,
	offlineQueueActions,
	processQueue,
	submitEventWithQueue,
	type QueuedEvent
} from './offlineQueue.js';
import { createQuickEvent } from '$lib/services/eventService.js';
import type { CreateQuickEventParams } from '$lib/services/eventService.js';

const QUEUE_STORAGE_KEY = 'ms-tracker-offline-queue';

const minimalParams = (eventTypeId = 't1'): CreateQuickEventParams => ({
	eventType: {
		id: eventTypeId,
		name: 'Test',
		slug: 'test',
		icon: '📝',
		has_severity: false,
		has_location: false,
		has_duration: false,
		auto_resolve: false,
		sort_order: 1,
		active: true,
		custom_fields: null,
		created_at: null,
		user_id: null
	}
});

const queuedItem = (overrides: Partial<QueuedEvent> = {}): QueuedEvent => ({
	id: 'q-1',
	params: minimalParams(),
	timestamp: Date.now(),
	retries: 0,
	...overrides
});

function readState() {
	let state: any;
	const unsub = offlineQueue.subscribe((s) => {
		state = s;
	});
	unsub();
	return state;
}

describe('offlineQueueActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		offlineQueue.set({ items: [], isProcessing: false, isOnline: true });
	});

	describe('addEvent', () => {
		it('appends item to state and persists to localStorage', () => {
			const id = offlineQueueActions.addEvent(minimalParams('panic'));

			expect(id).toBeTruthy();

			const state = readState();
			expect(state.items).toHaveLength(1);
			expect(state.items[0].id).toBe(id);
			expect(state.items[0].retries).toBe(0);
			expect(state.items[0].params.eventType.id).toBe('panic');

			const stored = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY)!);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe(id);
		});
	});

	describe('removeEvent', () => {
		it('removes item by id and persists update', () => {
			offlineQueue.set({
				items: [queuedItem({ id: 'a' }), queuedItem({ id: 'b' })],
				isProcessing: false,
				isOnline: true
			});

			offlineQueueActions.removeEvent('a');

			const state = readState();
			expect(state.items.map((i: QueuedEvent) => i.id)).toEqual(['b']);

			const stored = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY)!);
			expect(stored.map((i: QueuedEvent) => i.id)).toEqual(['b']);
		});
	});

	describe('updateEvent', () => {
		it('patches retries and lastError on the matching item', () => {
			offlineQueue.set({
				items: [queuedItem({ id: 'a' })],
				isProcessing: false,
				isOnline: true
			});

			offlineQueueActions.updateEvent('a', 2, 'network down');

			const state = readState();
			expect(state.items[0].retries).toBe(2);
			expect(state.items[0].lastError).toBe('network down');
		});
	});

	describe('clearQueue', () => {
		it('empties items and removes the localStorage key', () => {
			offlineQueue.set({
				items: [queuedItem({ id: 'a' })],
				isProcessing: false,
				isOnline: true
			});
			localStorage.setItem(QUEUE_STORAGE_KEY, '[]');

			offlineQueueActions.clearQueue();

			expect(readState().items).toEqual([]);
			expect(localStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();
		});
	});
});

describe('submitEventWithQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		offlineQueue.set({ items: [], isProcessing: false, isOnline: true });
	});

	it('returns success directly when createQuickEvent succeeds', async () => {
		vi.mocked(createQuickEvent).mockResolvedValueOnce({ success: true });

		const result = await submitEventWithQueue(minimalParams());

		expect(result).toEqual({ success: true });
		expect(readState().items).toHaveLength(0);
	});

	it('queues the event when createQuickEvent returns failure', async () => {
		vi.mocked(createQuickEvent).mockResolvedValueOnce({
			success: false,
			error: 'network down'
		});

		const result = await submitEventWithQueue(minimalParams());

		expect(result.success).toBe(true);
		expect(result.queued).toBe(true);
		expect(result.queueId).toBeTruthy();
		expect(readState().items).toHaveLength(1);
	});

	it('queues the event when createQuickEvent throws', async () => {
		vi.mocked(createQuickEvent).mockRejectedValueOnce(new Error('boom'));

		const result = await submitEventWithQueue(minimalParams());

		expect(result.queued).toBe(true);
		expect(result.queueId).toBeTruthy();
		expect(readState().items).toHaveLength(1);
	});
});

describe('processQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		offlineQueue.set({ items: [], isProcessing: false, isOnline: true });
	});

	it('skips when offline', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a' })],
			isProcessing: false,
			isOnline: false
		});

		await processQueue();

		expect(createQuickEvent).not.toHaveBeenCalled();
	});

	it('skips when already processing', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a' })],
			isProcessing: true,
			isOnline: true
		});

		await processQueue();

		expect(createQuickEvent).not.toHaveBeenCalled();
	});

	it('skips when queue is empty', async () => {
		await processQueue();

		expect(createQuickEvent).not.toHaveBeenCalled();
	});

	it('removes successfully-processed items from the queue', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a' })],
			isProcessing: false,
			isOnline: true
		});
		vi.mocked(createQuickEvent).mockResolvedValueOnce({
			success: true,
			event: { id: 'event-1' } as any
		});

		await processQueue();

		expect(createQuickEvent).toHaveBeenCalledTimes(1);
		expect(readState().items).toHaveLength(0);
	});

	it('bumps retry count on failure when under MAX_RETRIES', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a', retries: 1 })],
			isProcessing: false,
			isOnline: true
		});
		vi.mocked(createQuickEvent).mockResolvedValueOnce({
			success: false,
			error: 'transient'
		});

		await processQueue();

		const state = readState();
		expect(state.items).toHaveLength(1);
		expect(state.items[0].retries).toBe(2);
		expect(state.items[0].lastError).toBe('transient');
	});

	it('drops the item when MAX_RETRIES is reached', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a', retries: 3 })],
			isProcessing: false,
			isOnline: true
		});
		vi.mocked(createQuickEvent).mockResolvedValueOnce({
			success: false,
			error: 'persistent failure'
		});

		await processQueue();

		expect(readState().items).toHaveLength(0);
	});

	it('treats thrown exceptions as failures and bumps retries', async () => {
		offlineQueue.set({
			items: [queuedItem({ id: 'a', retries: 0 })],
			isProcessing: false,
			isOnline: true
		});
		vi.mocked(createQuickEvent).mockRejectedValueOnce(new Error('connection reset'));

		await processQueue();

		const state = readState();
		expect(state.items).toHaveLength(1);
		expect(state.items[0].retries).toBe(1);
		expect(state.items[0].lastError).toBe('connection reset');
	});
});
