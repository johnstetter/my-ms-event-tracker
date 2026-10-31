import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { createQuickEvent, type CreateQuickEventParams } from '$lib/services/eventService.js';
import { createServiceLogger, createTimer } from '$lib/logging/index.js';

// Service logger for offline queue operations
const log = createServiceLogger('offlineQueue');

// Queue item interface
export interface QueuedEvent {
	id: string;
	params: CreateQuickEventParams;
	timestamp: number;
	retries: number;
	lastError?: string;
}

// Queue state
export interface OfflineQueueState {
	items: QueuedEvent[];
	isProcessing: boolean;
	isOnline: boolean;
}

// Initial state
const initialState: OfflineQueueState = {
	items: [],
	isProcessing: false,
	isOnline: true
};

// Storage key
const QUEUE_STORAGE_KEY = 'ms-tracker-offline-queue';

// Create stores
export const offlineQueue = writable<OfflineQueueState>(initialState);

// Queue actions
export const offlineQueueActions = {
	// Add event to queue
	addEvent(params: CreateQuickEventParams): string {
		const queueItem: QueuedEvent = {
			id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
			params,
			timestamp: Date.now(),
			retries: 0
		};

		offlineQueue.update(state => {
			const newItems = [...state.items, queueItem];

			// Save to localStorage
			if (browser) {
				localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newItems));
			}

			return {
				...state,
				items: newItems
			};
		});

		return queueItem.id;
	},

	// Remove event from queue
	removeEvent(id: string): void {
		offlineQueue.update(state => {
			const newItems = state.items.filter(item => item.id !== id);

			// Save to localStorage
			if (browser) {
				localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newItems));
			}

			return {
				...state,
				items: newItems
			};
		});
	},

	// Update event retry count and error
	updateEvent(id: string, retries: number, error?: string): void {
		offlineQueue.update(state => {
			const newItems = state.items.map(item =>
				item.id === id
					? { ...item, retries, lastError: error }
					: item
			);

			// Save to localStorage
			if (browser) {
				localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newItems));
			}

			return {
				...state,
				items: newItems
			};
		});
	},

	// Set processing state
	setProcessing(isProcessing: boolean): void {
		offlineQueue.update(state => ({
			...state,
			isProcessing
		}));
	},

	// Set online state
	setOnline(isOnline: boolean): void {
		offlineQueue.update(state => ({
			...state,
			isOnline
		}));

		// Process queue if coming back online
		if (isOnline) {
			processQueue();
		}
	},

	// Clear all queued items
	clearQueue(): void {
		offlineQueue.update(state => {
			if (browser) {
				localStorage.removeItem(QUEUE_STORAGE_KEY);
			}

			return {
				...state,
				items: []
			};
		});
	}
};

// Process the queue
export async function processQueue(): Promise<void> {
	const operationLog = log.withContext({ operation: 'processQueue' });
	const timer = createTimer(operationLog, 'processQueue');

	let state: OfflineQueueState;
	const unsubscribe = offlineQueue.subscribe(s => state = s);
	unsubscribe();

	if (state!.isProcessing || !state!.isOnline || state!.items.length === 0) {
		if (!state!.isOnline) {
			operationLog.debug('Queue processing skipped - offline');
		} else if (state!.isProcessing) {
			operationLog.debug('Queue processing skipped - already processing');
		} else {
			operationLog.debug('Queue processing skipped - no items');
		}
		timer.end('Queue processing skipped');
		return;
	}

	operationLog.info('Starting queue processing', {
		queueSize: state!.items.length,
		isOnline: state!.isOnline
	});

	offlineQueueActions.setProcessing(true);

	const MAX_RETRIES = 3;
	const itemsToProcess = [...state!.items];

	let processedCount = 0;
	let errorCount = 0;

	for (const item of itemsToProcess) {
		const itemLog = operationLog.withContext({ queueItemId: item.id });
		const itemTimer = createTimer(itemLog, 'processQueueItem', {
			retryCount: item.retries,
			age: Date.now() - item.timestamp
		});

		try {
			itemLog.debug('Processing queued event', {
				retryCount: item.retries,
				age: Date.now() - item.timestamp,
				eventType: item.params.eventType?.name
			});

			const result = await createQuickEvent(item.params);

			if (result.success) {
				itemLog.info('Queue item processed successfully', {
					eventId: result.event?.id
				});
				itemTimer.end('Queue item processed');
				processedCount++;
				offlineQueueActions.removeEvent(item.id);
			} else {
				itemLog.warn('Queue item processing failed', {
					error: result.error,
					willRetry: item.retries < MAX_RETRIES,
					retryCount: item.retries
				});

				if (item.retries < MAX_RETRIES) {
					offlineQueueActions.updateEvent(item.id, item.retries + 1, result.error);
				} else {
					itemLog.error('Max retries reached, removing from queue', undefined, {
						finalError: result.error,
						totalRetries: item.retries
					});
					offlineQueueActions.removeEvent(item.id);
					errorCount++;
				}
				itemTimer.error('Queue item failed', undefined, { error: result.error });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			itemLog.error('Queue processing exception', error as Error, {
				retryCount: item.retries,
				willRetry: item.retries < MAX_RETRIES
			});

			if (item.retries < MAX_RETRIES) {
				offlineQueueActions.updateEvent(item.id, item.retries + 1, errorMessage);
			} else {
				offlineQueueActions.removeEvent(item.id);
				errorCount++;
			}
			itemTimer.error('Queue item exception', error as Error);
		}

		// Add small delay between processing items
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	operationLog.info('Queue processing completed', {
		totalItems: itemsToProcess.length,
		successCount: processedCount,
		errorCount: errorCount,
		remainingItems: itemsToProcess.length - processedCount - errorCount
	});
	timer.end('Queue processing finished');

	offlineQueueActions.setProcessing(false);
}

// Submit event with offline queue fallback
export async function submitEventWithQueue(params: CreateQuickEventParams): Promise<{
	success: boolean;
	queued?: boolean;
	queueId?: string;
	error?: string;
}> {
	// Try submitting directly first
	try {
		const result = await createQuickEvent(params);

		if (result.success) {
			return { success: true };
		} else {
			// If submission failed, queue it for later
			const queueId = offlineQueueActions.addEvent(params);
			return {
				success: true,
				queued: true,
				queueId
			};
		}
	} catch (error) {
		// Network error or other issue, queue for later
		const queueId = offlineQueueActions.addEvent(params);
		return {
			success: true,
			queued: true,
			queueId
		};
	}
}

// Load queue from localStorage on initialization
function loadQueueFromStorage(): void {
	if (!browser) return;

	const operationLog = log.withContext({ operation: 'loadQueueFromStorage' });

	try {
		const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
		if (stored) {
			const items: QueuedEvent[] = JSON.parse(stored);

			if (Array.isArray(items)) {
				operationLog.info('Offline queue loaded from storage', {
					itemsCount: items.length
				});
			} else {
				operationLog.warn('Invalid queue data format in storage, using empty queue');
			}

			offlineQueue.update(state => ({
				...state,
				items: Array.isArray(items) ? items : []
			}));
		} else {
			operationLog.debug('No offline queue found in storage, starting with empty queue');
		}
	} catch (error) {
		operationLog.warn('Failed to load offline queue from storage, clearing invalid data', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		// Clear invalid data
		localStorage.removeItem(QUEUE_STORAGE_KEY);
	}
}

// Initialize offline queue on browser startup
if (browser) {
	loadQueueFromStorage();

	// Listen for online/offline events
	window.addEventListener('online', () => {
		log.withContext({ operation: 'networkStatusChange' })
			.info('Network connection restored, will process queued events');
		offlineQueueActions.setOnline(true);
	});

	window.addEventListener('offline', () => {
		log.withContext({ operation: 'networkStatusChange' })
			.info('Network connection lost, events will be queued for later processing');
		offlineQueueActions.setOnline(false);
	});

	// Set initial online state
	offlineQueueActions.setOnline(navigator.onLine);

	// Process queue on startup if online
	if (navigator.onLine) {
		// Small delay to allow auth to initialize
		setTimeout(() => {
			processQueue();
		}, 1000);
	}
}