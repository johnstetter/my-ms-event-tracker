import { describe, it, expect } from 'vitest';

describe('Test configuration', () => {
	it('should have vitest working correctly', () => {
		expect(1 + 1).toBe(2);
	});

	it('should have jest-dom matchers available', () => {
		const div = document.createElement('div');
		div.textContent = 'Hello World';
		document.body.appendChild(div);

		expect(div).toBeInTheDocument();
		expect(div).toHaveTextContent('Hello World');

		document.body.removeChild(div);
	});
});