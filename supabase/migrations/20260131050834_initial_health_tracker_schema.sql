-- =============================================
-- HEALTH TRACKER SCHEMA
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