-- =============================================
-- ADD AUTO_RESOLVE FLAG TO EVENT_TYPES
-- =============================================
-- Some event types are point-in-time occurrences (e.g. bowel movements,
-- medication taken, blood-pressure readings) that have no useful "ongoing"
-- state — there's no follow-up intervention or duration to track. Marking
-- such types as auto_resolve causes EventService.createQuickEvent to set
-- ended_at = started_at on insert, so they appear resolved immediately and
-- don't clutter the ongoing-events UI.
--
-- This is a per-event-type capability flag (parity with has_severity /
-- has_location / has_duration). It is editable from the admin event-type
-- editor so users can opt their custom event types in.

ALTER TABLE event_types
  ADD COLUMN auto_resolve BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed: bowel-movement is the canonical point-in-time event type. See #53.
UPDATE event_types
  SET auto_resolve = TRUE
  WHERE slug = 'bowel-movement';
