import type { ExportEventData } from '../services/eventService.js';

// Dynamic imports for better code splitting
async function loadPDFLibraries() {
	try {
		const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

		if (!PDFDocument) {
			throw new Error('PDF generation libraries not found');
		}

		return { PDFDocument, rgb, StandardFonts };
	} catch (error) {
		console.error('Failed to load PDF libraries:', error);
		throw new Error('PDF generation libraries failed to load');
	}
}

// Export format types
export type ExportFormat = 'csv' | 'pdf';

// Summary statistics interface
export interface ExportSummaryStats {
	totalEvents: number;
	dateRange: {
		start: string;
		end: string;
	};
	eventTypeBreakdown: Array<{
		typeName: string;
		count: number;
		percentage: number;
	}>;
	severityStats?: {
		average: number;
		min: number;
		max: number;
		distribution: Record<number, number>;
	};
	commonLocations: Array<{
		location: string;
		count: number;
		percentage: number;
	}>;
	interventionUsage: Array<{
		intervention: string;
		count: number;
		percentage: number;
	}>;
}

/**
 * Generate summary statistics from export data
 */
export function generateSummaryStats(events: ExportEventData[]): ExportSummaryStats {
	if (events.length === 0) {
		return {
			totalEvents: 0,
			dateRange: { start: '', end: '' },
			eventTypeBreakdown: [],
			commonLocations: [],
			interventionUsage: []
		};
	}

	// Sort events by date to get range
	const sortedEvents = [...events].sort((a, b) =>
		new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
	);

	// Basic stats
	const totalEvents = events.length;
	const dateRange = {
		start: new Date(sortedEvents[0].started_at).toLocaleDateString(),
		end: new Date(sortedEvents[sortedEvents.length - 1].started_at).toLocaleDateString()
	};

	// Event type breakdown
	const typeCount = new Map<string, number>();
	events.forEach(event => {
		const typeName = event.event_type?.name || 'Unknown';
		typeCount.set(typeName, (typeCount.get(typeName) || 0) + 1);
	});

	const eventTypeBreakdown = Array.from(typeCount.entries())
		.map(([typeName, count]) => ({
			typeName,
			count,
			percentage: Math.round((count / totalEvents) * 100)
		}))
		.sort((a, b) => b.count - a.count);

	// Severity stats (for events that have severity)
	const severityValues = events
		.filter(event => event.severity !== null)
		.map(event => event.severity as number);

	let severityStats;
	if (severityValues.length > 0) {
		const distribution: Record<number, number> = {};
		severityValues.forEach(severity => {
			distribution[severity] = (distribution[severity] || 0) + 1;
		});

		severityStats = {
			average: Math.round((severityValues.reduce((sum, val) => sum + val, 0) / severityValues.length) * 10) / 10,
			min: Math.min(...severityValues),
			max: Math.max(...severityValues),
			distribution
		};
	}

	// Common locations
	const locationCount = new Map<string, number>();
	events.forEach(event => {
		event.event_locations?.forEach(loc => {
			const locationName = loc.body_location?.name || 'Unknown';
			locationCount.set(locationName, (locationCount.get(locationName) || 0) + 1);
		});
	});

	const commonLocations = Array.from(locationCount.entries())
		.map(([location, count]) => ({
			location,
			count,
			percentage: Math.round((count / totalEvents) * 100)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10); // Top 10 locations

	// Intervention usage
	const interventionCount = new Map<string, number>();
	events.forEach(event => {
		event.event_interventions?.forEach(intervention => {
			const interventionName = intervention.intervention?.name || 'Unknown';
			interventionCount.set(interventionName, (interventionCount.get(interventionName) || 0) + 1);
		});
	});

	const interventionUsage = Array.from(interventionCount.entries())
		.map(([intervention, count]) => ({
			intervention,
			count,
			percentage: Math.round((count / totalEvents) * 100)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10); // Top 10 interventions

	return {
		totalEvents,
		dateRange,
		eventTypeBreakdown,
		severityStats,
		commonLocations,
		interventionUsage
	};
}

/**
 * Convert events data to CSV format
 */
export function generateCSV(events: ExportEventData[], includeStats: boolean = true): string {
	if (events.length === 0) {
		return 'No events to export';
	}

	const headers = [
		'Date',
		'Time',
		'Event Type',
		'Severity',
		'Duration (hours)',
		'Body Locations',
		'Interventions',
		'Intervention Times',
		'Intervention Notes',
		'Timeline Notes',
		'Custom Fields'
	];

	const rows = events.map(event => {
		const startDate = new Date(event.started_at);
		const endDate = event.ended_at ? new Date(event.ended_at) : null;
		const duration = endDate ?
			Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 10) / 10 : '';

		// Format locations
		const locations = event.event_locations
			?.map(loc => loc.body_location?.name)
			.filter(Boolean)
			.join(', ') || '';

		// Format interventions
		const interventions = event.event_interventions
			?.map(inter => inter.intervention?.name)
			.filter(Boolean)
			.join(', ') || '';

		// Format intervention times
		const interventionTimes = event.event_interventions
			?.map(inter => inter.applied_at ? new Date(inter.applied_at).toLocaleString() : 'N/A')
			.join(', ') || '';

		// Format intervention notes
		const interventionNotes = event.event_interventions
			?.map(inter => inter.notes || 'N/A')
			.join(' | ') || '';

		// Format timeline notes (all notes chronologically)
		const timelineNotes = event.event_notes
			?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			.map(note => {
				const timestamp = new Date(note.created_at).toLocaleString();
				return `[${timestamp}] ${note.content}`;
			})
			.join(' | ') || '';

		// Format custom fields
		const customFields = event.attributes ?
			Object.entries(event.attributes as Record<string, any>)
				.map(([key, value]) => `${key}: ${value}`)
				.join(' | ') : '';

		return [
			startDate.toLocaleDateString(),
			startDate.toLocaleTimeString(),
			event.event_type?.name || 'Unknown',
			event.severity?.toString() || '',
			duration.toString(),
			locations,
			interventions,
			interventionTimes,
			interventionNotes,
			timelineNotes,
			customFields
		];
	});

	// Create CSV content
	let csvContent = headers.join(',') + '\n';
	csvContent += rows.map(row =>
		row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`)
		.join(',')
	).join('\n');

	// Add summary statistics if requested
	if (includeStats) {
		const stats = generateSummaryStats(events);
		csvContent += '\n\n--- SUMMARY STATISTICS ---\n';
		csvContent += `Total Events,${stats.totalEvents}\n`;
		csvContent += `Date Range,${stats.dateRange.start} to ${stats.dateRange.end}\n`;

		if (stats.severityStats) {
			csvContent += `Average Severity,${stats.severityStats.average}\n`;
		}

		csvContent += '\n--- EVENT TYPE BREAKDOWN ---\n';
		csvContent += 'Event Type,Count,Percentage\n';
		stats.eventTypeBreakdown.forEach(item => {
			csvContent += `${item.typeName},${item.count},${item.percentage}%\n`;
		});

		if (stats.commonLocations.length > 0) {
			csvContent += '\n--- COMMON LOCATIONS ---\n';
			csvContent += 'Location,Count,Percentage\n';
			stats.commonLocations.forEach(item => {
				csvContent += `${item.location},${item.count},${item.percentage}%\n`;
			});
		}

		if (stats.interventionUsage.length > 0) {
			csvContent += '\n--- INTERVENTION USAGE ---\n';
			csvContent += 'Intervention,Count,Percentage\n';
			stats.interventionUsage.forEach(item => {
				csvContent += `${item.intervention},${item.count},${item.percentage}%\n`;
			});
		}
	}

	return csvContent;
}

/**
 * Generate and download CSV file
 */
export function downloadCSV(events: ExportEventData[], filename?: string, includeStats: boolean = true) {
	// Input validation
	if (!events || !Array.isArray(events)) {
		throw new Error('Invalid events data provided');
	}
	const csvContent = generateCSV(events, includeStats);
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');

	const defaultFilename = `ms-events-export-${new Date().toISOString().split('T')[0]}.csv`;
	const url = URL.createObjectURL(blob);

	link.setAttribute('href', url);
	link.setAttribute('download', filename || defaultFilename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url); // Fix memory leak
}

/**
 * Generate PDF using PDF-lib
 */
export async function generatePDF(events: ExportEventData[], includeStats: boolean = true): Promise<any> {
	// Input validation
	if (!events || !Array.isArray(events)) {
		throw new Error('Invalid events data provided');
	}
	const { PDFDocument, rgb, StandardFonts } = await loadPDFLibraries();
	const stats = generateSummaryStats(events);
	const currentDate = new Date().toLocaleDateString();

	// Create new PDF document
	const pdfDoc = await PDFDocument.create();

	// Parallelize font loading for better performance
	const [timesRomanFont, timesRomanBold, helveticaFont, helveticaBold] = await Promise.all([
		pdfDoc.embedFont(StandardFonts.TimesRoman),
		pdfDoc.embedFont(StandardFonts.TimesRomanBold),
		pdfDoc.embedFont(StandardFonts.Helvetica),
		pdfDoc.embedFont(StandardFonts.HelveticaBold)
	]);

	// Page dimensions
	const pageWidth = 595.28; // A4 width in points
	const pageHeight = 841.89; // A4 height in points
	const margin = 40;
	const usableWidth = pageWidth - 2 * margin;

	// Add first page
	let page = pdfDoc.addPage([pageWidth, pageHeight]);
	let yPosition = pageHeight - margin;

	// Header
	const titleText = 'MS Event History Report';
	page.drawText(titleText, {
		x: pageWidth / 2 - (titleText.length * 10) / 2,
		y: yPosition,
		size: 20,
		font: helveticaBold,
		color: rgb(0, 0, 0),
	});
	yPosition -= 25;

	const subtitleText = 'Comprehensive event tracking and analysis';
	page.drawText(subtitleText, {
		x: pageWidth / 2 - (subtitleText.length * 6) / 2,
		y: yPosition,
		size: 12,
		font: helveticaFont,
		color: rgb(0.2, 0.2, 0.2),
	});
	yPosition -= 40;

	// Report metadata
	const metadataTexts = [
		`Generated on: ${currentDate}`,
		`Total Events: ${stats.totalEvents}`,
		...(stats.dateRange.start && stats.dateRange.end ?
			[`Date Range: ${stats.dateRange.start} - ${stats.dateRange.end}`] : []
		)
	];

	metadataTexts.forEach(text => {
		page.drawText(text, {
			x: pageWidth - margin - (text.length * 5.5),
			y: yPosition,
			size: 10,
			font: helveticaFont,
			color: rgb(0.3, 0.3, 0.3),
		});
		yPosition -= 15;
	});

	yPosition -= 20;

	// Add summary statistics if requested
	if (includeStats && stats.totalEvents > 0) {
		// Summary Statistics header
		page.drawText('Summary Statistics', {
			x: margin,
			y: yPosition,
			size: 16,
			font: helveticaBold,
			color: rgb(0, 0, 0),
		});
		yPosition -= 25;

		// Event overview box
		const boxHeight = 80;
		page.drawRectangle({
			x: margin,
			y: yPosition - boxHeight,
			width: 200,
			height: boxHeight,
			borderColor: rgb(0.7, 0.7, 0.7),
			borderWidth: 1,
		});

		page.drawText('Event Overview', {
			x: margin + 10,
			y: yPosition - 20,
			size: 12,
			font: helveticaBold,
			color: rgb(0, 0, 0),
		});

		page.drawText(`Total Events: ${stats.totalEvents}`, {
			x: margin + 10,
			y: yPosition - 40,
			size: 10,
			font: helveticaFont,
			color: rgb(0, 0, 0),
		});

		page.drawText(`Period: ${stats.dateRange.start} to ${stats.dateRange.end}`, {
			x: margin + 10,
			y: yPosition - 55,
			size: 10,
			font: helveticaFont,
			color: rgb(0, 0, 0),
		});

		// Severity stats if available
		if (stats.severityStats) {
			page.drawRectangle({
				x: margin + 220,
				y: yPosition - boxHeight,
				width: 200,
				height: boxHeight,
				borderColor: rgb(0.7, 0.7, 0.7),
				borderWidth: 1,
			});

			page.drawText('Severity Analysis', {
				x: margin + 230,
				y: yPosition - 20,
				size: 12,
				font: helveticaBold,
				color: rgb(0, 0, 0),
			});

			page.drawText(`Average: ${stats.severityStats.average}/10`, {
				x: margin + 230,
				y: yPosition - 40,
				size: 10,
				font: helveticaFont,
				color: rgb(0, 0, 0),
			});

			page.drawText(`Range: ${stats.severityStats.min} - ${stats.severityStats.max}`, {
				x: margin + 230,
				y: yPosition - 55,
				size: 10,
				font: helveticaFont,
				color: rgb(0, 0, 0),
			});
		}

		yPosition -= boxHeight + 30;

		// Event Type Breakdown
		if (stats.eventTypeBreakdown.length > 0) {
			page.drawText('Event Type Breakdown', {
				x: margin,
				y: yPosition,
				size: 12,
				font: helveticaBold,
				color: rgb(0, 0, 0),
			});
			yPosition -= 20;

			stats.eventTypeBreakdown.slice(0, 8).forEach(item => {
				page.drawText(`• ${item.typeName}: ${item.count} events (${item.percentage}%)`, {
					x: margin + 15,
					y: yPosition,
					size: 9,
					font: helveticaFont,
					color: rgb(0, 0, 0),
				});
				yPosition -= 15;
			});
			yPosition -= 10;
		}

		// Check if we need a new page
		if (yPosition < 200) {
			page = pdfDoc.addPage([pageWidth, pageHeight]);
			yPosition = pageHeight - margin;
		}

		// Most affected locations
		if (stats.commonLocations.length > 0) {
			page.drawText('Most Affected Locations', {
				x: margin,
				y: yPosition,
				size: 12,
				font: helveticaBold,
				color: rgb(0, 0, 0),
			});
			yPosition -= 20;

			stats.commonLocations.slice(0, 5).forEach(item => {
				page.drawText(`• ${item.location}: ${item.count} events (${item.percentage}%)`, {
					x: margin + 15,
					y: yPosition,
					size: 9,
					font: helveticaFont,
					color: rgb(0, 0, 0),
				});
				yPosition -= 15;
			});
			yPosition -= 10;
		}

		// Most used interventions
		if (stats.interventionUsage.length > 0) {
			if (yPosition < 150) {
				page = pdfDoc.addPage([pageWidth, pageHeight]);
				yPosition = pageHeight - margin;
			}

			page.drawText('Most Used Interventions', {
				x: margin,
				y: yPosition,
				size: 12,
				font: helveticaBold,
				color: rgb(0, 0, 0),
			});
			yPosition -= 20;

			stats.interventionUsage.slice(0, 5).forEach(item => {
				page.drawText(`• ${item.intervention}: ${item.count} times (${item.percentage}%)`, {
					x: margin + 15,
					y: yPosition,
					size: 9,
					font: helveticaFont,
					color: rgb(0, 0, 0),
				});
				yPosition -= 15;
			});
			yPosition -= 20;
		}

		// Add new page for event details
		page = pdfDoc.addPage([pageWidth, pageHeight]);
		yPosition = pageHeight - margin;
	}

	// Event Details header
	page.drawText('Event Details', {
		x: margin,
		y: yPosition,
		size: 16,
		font: helveticaBold,
		color: rgb(0, 0, 0),
	});
	yPosition -= 30;

	// Simple table for events (PDF-lib doesn't have auto-table, so we create a simple layout)
	const rowHeight = 60;
	const colWidths = [80, 80, 60, 100, 60, 100, 100];
	const headers = ['Date', 'Type', 'Severity', 'Locations', 'Duration', 'Interventions', 'Notes'];

	// Draw table headers
	let xPosition = margin;
	headers.forEach((header, i) => {
		page.drawText(header, {
			x: xPosition + 5,
			y: yPosition,
			size: 10,
			font: helveticaBold,
			color: rgb(1, 1, 1),
		});

		page.drawRectangle({
			x: xPosition,
			y: yPosition - 5,
			width: colWidths[i],
			height: 20,
			color: rgb(0, 0.48, 1), // Blue header
		});

		xPosition += colWidths[i];
	});
	yPosition -= 25;

	// Draw event rows (all events, with pagination support)
	events.forEach((event, rowIndex) => {
		const startDate = new Date(event.started_at);
		const endDate = event.ended_at ? new Date(event.ended_at) : null;
		const duration = endDate ?
			Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 10) / 10 + 'h' : 'Ongoing';

		const locations = event.event_locations
			?.map(loc => loc.body_location?.name)
			.filter(Boolean)
			.join(', ') || 'N/A';

		const interventions = event.event_interventions
			?.map(inter => inter.intervention?.name)
			.filter(Boolean)
			.join(', ') || 'None';

		// Format timeline notes for display (abbreviated for PDF table)
		const timelineNotesText = event.event_notes
			?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			.map(note => note.content)
			.join(' | ') || 'No notes';

		const notes = timelineNotesText.length > 40 ?
			timelineNotesText.substring(0, 37) + '...' : timelineNotesText;

		const rowData = [
			startDate.toLocaleDateString(),
			event.event_type?.name || 'Unknown',
			event.severity?.toString() || 'N/A',
			locations.length > 25 ? locations.substring(0, 22) + '...' : locations,
			duration,
			interventions.length > 25 ? interventions.substring(0, 22) + '...' : interventions,
			notes
		];

		xPosition = margin;

		// Draw row background
		page.drawRectangle({
			x: margin,
			y: yPosition - rowHeight + 5,
			width: usableWidth - margin,
			height: rowHeight,
			color: rowIndex % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
			borderColor: rgb(0.8, 0.8, 0.8),
			borderWidth: 0.5,
		});

		rowData.forEach((cellData, i) => {
			// Wrap text if too long
			const maxChars = Math.floor(colWidths[i] / 5);
			const displayText = cellData.length > maxChars ?
				cellData.substring(0, maxChars - 3) + '...' : cellData;

			page.drawText(displayText, {
				x: xPosition + 5,
				y: yPosition - 15,
				size: 8,
				font: helveticaFont,
				color: rgb(0, 0, 0),
			});

			xPosition += colWidths[i];
		});

		yPosition -= rowHeight;

		// Check if we need a new page
		if (yPosition < 100) {
			page = pdfDoc.addPage([pageWidth, pageHeight]);
			yPosition = pageHeight - margin;
		}
	});

	// Add footer to all pages
	const pages = pdfDoc.getPages();
	pages.forEach((page, i) => {
		const footerText = `Generated by MS Event Tracker • ${currentDate} • Page ${i + 1} of ${pages.length}`;
		page.drawText(footerText, {
			x: pageWidth / 2 - (footerText.length * 3),
			y: 30,
			size: 8,
			font: helveticaFont,
			color: rgb(0.5, 0.5, 0.5),
		});

		const disclaimerText = 'This report contains personal health information - handle with care';
		page.drawText(disclaimerText, {
			x: pageWidth / 2 - (disclaimerText.length * 3),
			y: 15,
			size: 8,
			font: helveticaFont,
			color: rgb(0.5, 0.5, 0.5),
		});
	});

	return pdfDoc;
}

/**
 * Generate and download PDF using PDF-lib
 */
export async function downloadPDF(events: ExportEventData[], filename?: string, includeStats: boolean = true) {
	// Input validation
	if (!events || !Array.isArray(events)) {
		throw new Error('Invalid events data provided');
	}

	try {
		// Generate PDF document
		const pdfDoc = await generatePDF(events, includeStats);

		// Serialize PDF to bytes
		const pdfBytes = await pdfDoc.save();

		// Create filename
		const defaultFilename = `ms-events-report-${new Date().toISOString().split('T')[0]}.pdf`;
		const finalFilename = filename || defaultFilename;

		// Create blob and download
		const blob = new Blob([pdfBytes], { type: 'application/pdf' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);

		link.setAttribute('href', url);
		link.setAttribute('download', finalFilename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

	} catch (error) {
		console.error('Error generating PDF:', error);

		// Fallback to HTML download if PDF generation fails
		alert('PDF generation failed. Downloading as HTML file instead.');

		const htmlContent = generateFallbackHTML(events, includeStats);
		const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
		const link = document.createElement('a');
		const fallbackFilename = filename?.replace('.pdf', '.html') ||
			`ms-events-report-${new Date().toISOString().split('T')[0]}.html`;
		const url = URL.createObjectURL(blob);

		link.setAttribute('href', url);
		link.setAttribute('download', fallbackFilename);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}
}

/**
 * Escape HTML to prevent XSS vulnerabilities
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Generate fallback HTML content for cases where PDF generation fails
 */
function generateFallbackHTML(events: ExportEventData[], includeStats: boolean = true): string {
	const stats = generateSummaryStats(events);
	const currentDate = new Date().toLocaleDateString();

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>MS Event History Report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
		.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
		.stats { background: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff; }
		table { width: 100%; border-collapse: collapse; margin: 20px 0; }
		th { background: #007bff; color: white; padding: 8px; text-align: left; }
		td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
		.footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
	</style>
</head>
<body>
	<div class="header">
		<h1>MS Event History Report</h1>
		<p>Generated on ${currentDate} • Total Events: ${stats.totalEvents}</p>
	</div>

	${includeStats ? `
	<div class="stats">
		<h2>Summary Statistics</h2>
		<p><strong>Date Range:</strong> ${stats.dateRange.start} - ${stats.dateRange.end}</p>
		${stats.severityStats ? `<p><strong>Average Severity:</strong> ${stats.severityStats.average}/10</p>` : ''}

		<h3>Event Types:</h3>
		<ul>
			${stats.eventTypeBreakdown.map(item =>
				`<li>${escapeHtml(item.typeName)}: ${item.count} events (${item.percentage}%)</li>`
			).join('')}
		</ul>

		${stats.commonLocations.length > 0 ? `
		<h3>Common Locations:</h3>
		<ul>
			${stats.commonLocations.slice(0, 5).map(item =>
				`<li>${escapeHtml(item.location)}: ${item.count} events</li>`
			).join('')}
		</ul>
		` : ''}
	</div>
	` : ''}

	<h2>Event Details</h2>
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Type</th>
				<th>Severity</th>
				<th>Locations</th>
				<th>Duration</th>
				<th>Notes</th>
			</tr>
		</thead>
		<tbody>
			${events.map(event => {
				const startDate = new Date(event.started_at);
				const endDate = event.ended_at ? new Date(event.ended_at) : null;
				const duration = endDate ?
					Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 10) / 10 + 'h' : 'Ongoing';
				const locations = event.event_locations?.map(loc => loc.body_location?.name).filter(Boolean).join(', ') || 'N/A';

				return `<tr>
					<td>${startDate.toLocaleDateString()}</td>
					<td>${escapeHtml(event.event_type?.name || 'Unknown')}</td>
					<td>${event.severity || 'N/A'}</td>
					<td>${escapeHtml(locations)}</td>
					<td>${duration}</td>
					<td>${escapeHtml(event.event_notes?.map(note => `[${new Date(note.created_at).toLocaleDateString()}] ${note.content}`).join(' | ') || 'No notes')}</td>
				</tr>`;
			}).join('')}
		</tbody>
	</table>

	<div class="footer">
		<p>Generated by MS Event Tracker • This report contains personal health information</p>
	</div>
</body>
</html>`;
}