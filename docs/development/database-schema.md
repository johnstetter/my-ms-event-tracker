# Database Schema Design

This document describes the complete database schema for the MS Symptom Tracker application, including table structures, relationships, security policies, and sample data.

## Overview

The database is built on PostgreSQL via Supabase and uses Row Level Security (RLS) to ensure data isolation between users. The schema supports:

- Multiple event types — physical (muscle spasms, pain episodes, bowel movements) and mental-health (panic attacks, anxiety, intrusive thoughts)
- Flexible body location tracking (skipped on event types where `has_location = false`)
- Intervention logging with timestamps
- **Many-to-many intervention scope tags** so the picker can filter interventions by the active event type, with universal-by-default semantics
- User-scoped admin via nullable `user_id` columns on `event_types`, `body_locations`, and `interventions` (NULL = system default visible to all)
- Event lifecycle management (start → interventions → resolution)
- Future API access for external integrations

---

## Core Tables

### `event_types`
Defines the types of events that can be logged (extensible via admin UI).

```sql
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Muscle Spasm", "Pain Episode"
  slug TEXT UNIQUE NOT NULL,             -- "muscle-spasm", "pain-episode"
  icon TEXT,                             -- "⚡", "🔥"
  sort_order INTEGER DEFAULT 0,         -- Display order
  active BOOLEAN DEFAULT true,          -- Soft delete
  has_duration BOOLEAN DEFAULT false,   -- Can track duration?
  has_location BOOLEAN DEFAULT false,   -- Can attach body locations?
  has_severity BOOLEAN DEFAULT false,   -- Can rate severity 1-10?
  custom_fields JSONB DEFAULT '[]',     -- Custom form fields for this type
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Purpose**: Flexible event type system that can be extended without code changes.

**Custom Fields Example** (Bowel Movement):
```json
[
  {"name": "duration", "type": "select", "options": ["Quick (<5 min)", "Normal (5-15 min)", "Extended (15+ min)"]},
  {"name": "consistency", "type": "select", "options": ["Hard", "Normal", "Loose"]},
  {"name": "amount", "type": "number", "label": "Flush count"}
]
```

### `events`
The main events table - each row represents a symptom episode.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  event_type_id UUID REFERENCES event_types(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),    -- When episode began
  ended_at TIMESTAMPTZ,                             -- When resolved (NULL = ongoing)
  severity INTEGER CHECK (severity >= 1 AND severity <= 10),
  attributes JSONB DEFAULT '{}',                    -- Custom field values
  notes TEXT,                                       -- Free-form notes
  created_at TIMESTAMPTZ DEFAULT now(),            -- When logged
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Features**:
- `started_at` vs `created_at`: Episode start time vs when it was logged
- `ended_at` = NULL means event is still ongoing
- `attributes` stores custom field values from `event_types.custom_fields`
- `severity` is optional (controlled by `event_types.has_severity`)

### `body_locations`
Body parts for pain/spasm tracking.

```sql
CREATE TABLE body_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Left Quad", "SI Joint"
  region TEXT,                          -- "Lower Body", "Core"
  sort_order INTEGER DEFAULT 0,        -- Display order
  active BOOLEAN DEFAULT true
);
```

**Regions**:
- Lower Body: Legs, calves, quads, hamstrings
- Core: Hips, back, SI joint
- Upper Body: Shoulders, neck, hands/wrists

### `interventions`
Actions taken to address episodes.

```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Oral Baclofen", "Cannabis - Vaporizer"
  category TEXT,                        -- "Medication", "Physical"
  sort_order INTEGER DEFAULT 0,        -- Display order
  active BOOLEAN DEFAULT true
);
```

**Categories**:
- Medication: Baclofen, cannabis products
- Physical: Stretching, heat, massage, position changes

---

## Junction Tables

### `event_locations`
Many-to-many: which body locations are affected by an event.

```sql
CREATE TABLE event_locations (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  body_location_id UUID REFERENCES body_locations(id),
  PRIMARY KEY (event_id, body_location_id)
);
```

**Usage**: A single spasm can affect multiple locations (e.g., "Left Quad" + "Left Hamstring").

### `event_interventions`
Track what interventions were applied to an event and when.

```sql
CREATE TABLE event_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id),
  applied_at TIMESTAMPTZ DEFAULT now(),             -- When intervention was taken
  notes TEXT                                        -- "10mg", "2 puffs Pineapple Express"
);
```

**Timeline**: Multiple interventions can be applied over time as the episode evolves.

### `intervention_event_types`
Many-to-many scope tags: which interventions appear in which event type's picker.

```sql
CREATE TABLE intervention_event_types (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  PRIMARY KEY (intervention_id, event_type_id)
);
```

**Filter rule (universal-by-default)** — applied in the application layer:

- An intervention with **zero rows** in this table → applies to every event type (universal — e.g. Rest, medications).
- An intervention with **one or more rows** → applies only to the listed event types.

This lets a panic-attack picker show grounding/breathing/journaling without showing Heat Pack, while keeping universally-useful interventions like Rest visible everywhere.

**RLS write rule**: tied to the *intervention's* `user_id`. Users can manage scope tags only for interventions they own; system intervention scope is seed-frozen at install. This is intentional — see commit message for the seed migration if per-user override becomes desirable.

---

## API Integration Table

### `api_keys`
For future Home Assistant integration.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,                               -- "Home Assistant"
  key_hash TEXT NOT NULL,                          -- Hashed API key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ                           -- NULL = active
);
```

**Security**: Keys are hashed and can be revoked without deletion for audit trail.

---

## Indexes for Performance

```sql
-- User event queries
CREATE INDEX events_user_id_idx ON events(user_id);

-- Chronological ordering
CREATE INDEX events_started_at_idx ON events(started_at DESC);

-- Event type filtering
CREATE INDEX events_type_idx ON events(event_type_id);

-- Quick lookup of open/unresolved events
CREATE INDEX events_open_idx ON events(ended_at) WHERE ended_at IS NULL;
```

**Query Patterns Optimized**:
- Homepage: Recent events for user
- Active events: Open episodes needing intervention
- History: Chronological event listing
- Filtering: By event type or date range

---

## Row Level Security (RLS)

All user data is isolated using Supabase RLS policies:

### User Data Tables

```sql
-- Events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
ON events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON events FOR DELETE USING (auth.uid() = user_id);

-- Junction tables inherit security through foreign key relationships
CREATE POLICY "Users can manage locations for their events"
ON event_locations FOR ALL
USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage interventions for their events"
ON event_interventions FOR ALL
USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));
```

### Reference Data Tables

```sql
-- Reference tables are readable by all authenticated users
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event types are readable by authenticated users"
ON event_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Body locations are readable by authenticated users"
ON body_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Interventions are readable by authenticated users"
ON interventions FOR SELECT TO authenticated USING (true);
```

### API Keys

```sql
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
ON api_keys FOR ALL USING (auth.uid() = user_id);
```

---

## Seed Data

### Event Types

System defaults (`user_id IS NULL`):

| name | slug | icon | has_duration | has_location | has_severity | custom_fields |
|------|------|------|--------------|--------------|--------------|---------------|
| Muscle Spasm | muscle-spasm | ⚡ | true | true | true | [] |
| Pain Episode | pain-episode | 🔥 | true | true | true | [] |
| Bowel Movement | bowel-movement | 💩 | true | false | false | [duration, consistency, amount] |
| Panic Attack | panic-attack | 🌀 | true | false | true | [] |
| Anxiety | anxiety | 😰 | true | false | true | [] |
| Intrusive Thought | intrusive-thought | 💭 | true | false | true | [] |

### Body Locations

| name | region | sort_order |
|------|--------|------------|
| Left Calf | Lower Body | 1 |
| Right Calf | Lower Body | 2 |
| Left Quad | Lower Body | 3 |
| Right Quad | Lower Body | 4 |
| Left Hamstring | Lower Body | 5 |
| Right Hamstring | Lower Body | 6 |
| Left Hip | Core | 7 |
| Right Hip | Core | 8 |
| SI Joint | Core | 9 |
| Lower Back | Core | 10 |
| Left Shoulder | Upper Body | 11 |
| Right Shoulder | Upper Body | 12 |
| Neck | Upper Body | 13 |
| Left Hand/Wrist | Upper Body | 14 |
| Right Hand/Wrist | Upper Body | 15 |

### Interventions

System defaults (`user_id IS NULL`):

| name | category | sort_order |
|------|----------|------------|
| Oral Baclofen | Medication | 1 |
| Cannabis - Vaporizer | Medication | 2 |
| Cannabis - Edible | Medication | 3 |
| Stretching | Physical | 10 |
| Heat Pack | Physical | 11 |
| Massage | Physical | 12 |
| Position Change | Physical | 13 |
| Rest | Physical | 14 |
| Theracane | Physical | 15 |
| Tennis Ball | Physical | 16 |
| Grounding Exercise | Mental Health | 11 |
| Deep Breathing | Mental Health | 12 |
| Call Therapist | Mental Health | 13 |
| Journaling | Mental Health | 14 |
| PRN Medication | Mental Health | 15 |

### Intervention Scope Tags

Seed wires up the picker filter so each event type shows the right set:

- **Mental interventions × mental event types** (5 × 3 = 15 rows): grounding/breathing/therapist/journaling/PRN tagged to panic + anxiety + intrusive-thought.
- **Physical-only interventions × physical event types** (6 × 2 = 12 rows): Stretching, Heat Pack, Massage, Position Change, Theracane, Tennis Ball tagged to muscle-spasm + pain-episode.
- **Untagged → universal**: Rest, Oral Baclofen, Cannabis - Vaporizer, Cannabis - Edible. They appear in every picker (including bowel-movement, which would otherwise be empty).

---

## Complete Migration Script

> **Note**: the embedded script below was the original single-migration snapshot from January 2026. The schema has since evolved across multiple incremental migrations (user-scoped admin in `20260212`, `event_notes` in `20260315`, `intervention_event_types` and the mental-health seed in `20260426`). For the authoritative state, run `supabase db reset` against `supabase/migrations/`. The script below is preserved for narrative reference only.

```sql
-- =============================================
-- HEALTH TRACKER SCHEMA (initial snapshot — January 2026)
-- =============================================

-- Event types (spasm, pain, bowel movement, etc.)
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  has_duration BOOLEAN DEFAULT false,
  has_location BOOLEAN DEFAULT false,
  has_severity BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Body locations for pain/spasm tracking
CREATE TABLE body_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- Interventions (what you do to address episodes)
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- Main events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  event_type_id UUID REFERENCES event_types(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  severity INTEGER CHECK (severity >= 1 AND severity <= 10),
  attributes JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: which body locations are affected
CREATE TABLE event_locations (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  body_location_id UUID REFERENCES body_locations(id),
  PRIMARY KEY (event_id, body_location_id)
);

-- Junction: what interventions were applied
CREATE TABLE event_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id),
  applied_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- API keys for external access (Home Assistant, etc.)
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX events_user_id_idx ON events(user_id);
CREATE INDEX events_started_at_idx ON events(started_at DESC);
CREATE INDEX events_type_idx ON events(event_type_id);
CREATE INDEX events_open_idx ON events(ended_at) WHERE ended_at IS NULL;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
ON events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
ON events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage locations for their events"
ON event_locations FOR ALL
USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage interventions for their events"
ON event_interventions FOR ALL
USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event types are readable by authenticated users"
ON event_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Body locations are readable by authenticated users"
ON body_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Interventions are readable by authenticated users"
ON interventions FOR SELECT TO authenticated USING (true);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
ON api_keys FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO event_types (name, slug, icon, has_duration, has_location, has_severity, sort_order, custom_fields) VALUES
  ('Muscle Spasm', 'muscle-spasm', '⚡', true, true, true, 1, '[]'),
  ('Pain Episode', 'pain-episode', '🔥', true, true, true, 2, '[]'),
  ('Bowel Movement', 'bowel-movement', '💩', true, false, false, 10,
   '[{"name": "duration", "type": "select", "options": ["Quick (<5 min)", "Normal (5-15 min)", "Extended (15+ min)"]}, {"name": "consistency", "type": "select", "options": ["Hard", "Normal", "Loose"]}, {"name": "amount", "type": "number", "label": "Flush count"}]');

INSERT INTO body_locations (name, region, sort_order) VALUES
  ('Left Calf', 'Lower Body', 1),
  ('Right Calf', 'Lower Body', 2),
  ('Left Quad', 'Lower Body', 3),
  ('Right Quad', 'Lower Body', 4),
  ('Left Hamstring', 'Lower Body', 5),
  ('Right Hamstring', 'Lower Body', 6),
  ('Left Hip', 'Core', 7),
  ('Right Hip', 'Core', 8),
  ('SI Joint', 'Core', 9),
  ('Lower Back', 'Core', 10),
  ('Left Shoulder', 'Upper Body', 11),
  ('Right Shoulder', 'Upper Body', 12),
  ('Neck', 'Upper Body', 13),
  ('Left Hand/Wrist', 'Upper Body', 14),
  ('Right Hand/Wrist', 'Upper Body', 15);

INSERT INTO interventions (name, category, sort_order) VALUES
  ('Oral Baclofen', 'Medication', 1),
  ('Cannabis - Vaporizer', 'Medication', 2),
  ('Cannabis - Edible', 'Medication', 3),
  ('Stretching', 'Physical', 10),
  ('Heat Pack', 'Physical', 11),
  ('Massage', 'Physical', 12),
  ('Position Change', 'Physical', 13),
  ('Rest', 'Physical', 14),
  ('Theracane', 'Physical', 15),
  ('Tennis Ball', 'Physical', 16);
```

---

## Related Documentation

- **[Developer Guide](developer-guide.md)**: Architecture overview and development guidelines
- **[API Design](api-design.md)**: External API endpoints for Home Assistant integration
- **[Development Environment](../setup/development-environment.md)**: Local database setup and management