# my-ms-event-tracker - Project Context for Claude Code

## Project Overview

A personal health event tracking application called **my-ms-event-tracker** for people living with Multiple Sclerosis. The primary use case is **quick capture of muscle spasms and pain episodes** - logging location, severity, interventions, and resolution. Secondary use cases include bowel movement tracking and future extensibility for other health events.

**Key requirement:** Logging must be fast. When a spasm hits, the user needs to capture it in 5 seconds, then come back later to add interventions and mark it resolved.

---

## Project Goals

- Export data to spreadsheets for medical providers
- Learn frontend development through iterative building

---

## 🚨 DEVELOPMENT WORKFLOW CHECKLIST

**Before making ANY code change, verify:**

- [ ] **Issue created FIRST** - Did I create a GitHub issue before starting?
- [ ] **Correct branch** - Am I on a feature branch (NOT main)?
- [ ] **Workflow compliance** - Am I following the documented standards?
- [ ] **Learning objective** - Does this support BOTH technology AND process learning?

**Remember:** Process discipline is as important as the technology. This project teaches professional development workflows that scale to team environments.

**Workflow violations undermine the educational value and break professional development habits.**

---

## Autonomy & Solo Operator Context

The owner is the **sole user, sole developer, and sole operator** of this project — there is no team, no other accounts, no shared production environment. The product itself is a single-user app (auth exists only to secure the owner's own data, not for multi-tenancy).

Because of this, several "ask before acting" defaults from the global `~/.claude/CLAUDE.md` are relaxed **for this repository only**:

**OK to do without asking** (assuming the prerequisite — usually a merged PR — is true):
- Apply pending migrations to the remote Supabase project (`supabase db push`) once the PR containing them has been merged to `main`.
- Push feature branches and open PRs.
- Run smoke tests against the running dev server, including writing test data.
- Clear the local Supabase DB (`supabase db reset`) for local-only verification.

**Still ask first** (these stay gated regardless of solo status — the risk isn't about other users, it's about reversibility or scope creep):
- Merging PRs — workflow discipline, the owner reviews and merges.
- Force pushes, `git reset --hard` to remote, branch deletion against remote.
- Anything that would destroy or rewrite production data (`DROP`, mass `DELETE`/`UPDATE` outside a migration, deleting Supabase project resources).
- Installing OS-level software, modifying global config, touching anything outside this repo and its directly-linked Supabase project.
- Committing anything that looks like a secret.

The workflow discipline above (issue-first, feature branch, PR-per-change, no squash) **still applies** — solo doesn't mean sloppy. The autonomy adjustment is specifically about which routine, post-merge actions Claude can execute without a per-action confirm.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | SvelteKit | Static build, modern framework, good learning path |
| **Hosting** | Cloudflare Pages | Free tier, simple deployment, git-based |
| **Database** | Supabase (Postgres) | Free tier, nice UI, auto-generated REST API |
| **Auth** | Supabase Auth | Google sign-in, single user |
| **Dev Environment** | Devbox | Reproducible Nix-based environment |
| **Version Control** | GitHub | Issue tracking, PR workflow |

---

## Supabase Configuration

**Project Name:** my-ms-event-tracker

**Project URL:** `https://your-project-ref.supabase.co`

**Anon Key:** `your-anon-key-here`

**IMPORTANT:** These must be stored in environment variables, never committed to the repo.

- Local: `.env` file (gitignored)
- Cloudflare: Environment variables in Pages settings

```
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Database Schema

### Tables

#### `event_types`
Defines the types of events that can be logged (extensible via admin UI).

```sql
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
```

#### `body_locations`
Body locations for pain/spasm tracking.

```sql
CREATE TABLE body_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);
```

#### `interventions`
Actions taken to address episodes.

```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);
```

#### `events`
The main events table.

```sql
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
```

#### `event_locations`
Junction table: which body locations are affected.

```sql
CREATE TABLE event_locations (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  body_location_id UUID REFERENCES body_locations(id),
  PRIMARY KEY (event_id, body_location_id)
);
```

#### `event_interventions`
Junction table: what interventions were applied.

```sql
CREATE TABLE event_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id),
  applied_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);
```

### Indexes

```sql
CREATE INDEX events_user_id_idx ON events(user_id);
CREATE INDEX events_started_at_idx ON events(started_at DESC);
CREATE INDEX events_type_idx ON events(event_type_id);
CREATE INDEX events_open_idx ON events(ended_at) WHERE ended_at IS NULL;
```

### Row Level Security

All user data tables have RLS enabled. Users can only access their own events.

```sql
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

-- Reference tables: readable by all authenticated users
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
```

### Seed Data

#### Event Types

| name | slug | icon | has_duration | has_location | has_severity | custom_fields |
|------|------|------|--------------|--------------|--------------|---------------|
| Muscle Spasm | muscle-spasm | ⚡ | true | true | true | [] |
| Pain Episode | pain-episode | 🔥 | true | true | true | [] |
| Bowel Movement | bowel-movement | 💩 | true | false | false | [duration, consistency, amount] |

Bowel Movement custom_fields:
```json
[
  {"name": "duration", "type": "select", "options": ["Quick (<5 min)", "Normal (5-15 min)", "Extended (15+ min)"]},
  {"name": "consistency", "type": "select", "options": ["Hard", "Normal", "Loose"]},
  {"name": "amount", "type": "number", "label": "Flush count"}
]
```

#### Body Locations

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

#### Interventions

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

---

## Complete SQL Script

Run this in Supabase SQL Editor to create all tables, RLS policies, and seed data:

```sql
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
```

---

## Cloudflare Pages Setup

**Not yet configured.** Steps to complete:

1. Create Cloudflare account (if needed)
2. Connect GitHub repository to Cloudflare Pages
3. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `build`
   - Node version: 18+
4. Add environment variables in Cloudflare Pages settings

---

## Supabase Auth Setup

**Not yet configured.** Steps to complete:

1. In Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Configure OAuth credentials from Google Cloud Console
4. Set redirect URL in Supabase
5. Configure allowed redirect URLs for local dev and production

---

## UI Design Principles

### Quick Capture Priority

The home screen must prioritize speed of logging:

```
┌─────────────────────────────────────┐
│  ⚡ ACTIVE: Left Quad Spasm (7/10)  │  ← Prominent if event is open
│     Started 12 min ago              │
│     [Add Intervention] [Resolve]    │
├─────────────────────────────────────┤
│                                     │
│   ┌─────────┐  ┌─────────┐         │
│   │   ⚡    │  │   🔥    │         │  ← Big tap targets
│   │ Spasm   │  │  Pain   │         │
│   └─────────┘  └─────────┘         │
│                                     │
│   ┌─────────┐  ┌─────────┐         │
│   │   💩    │  │   ➕    │         │
│   │ Bowel   │  │  Other  │         │
│   └─────────┘  └─────────┘         │
│                                     │
├─────────────────────────────────────┤
│  Recent Events                      │
│  • Spasm - Left Quad - 2hr ago ✓    │
│  • Pain - SI Joint - Yesterday ✓    │
└─────────────────────────────────────┘
```

### Spasm/Pain Logging Flow

1. Tap event type (Spasm or Pain)
2. Select body location(s) - checkboxes, can select multiple
3. Set severity (1-10 slider)
4. Save → Event is now "open"

### Adding Intervention (Later)

1. Tap active event banner or find in recent events
2. Tap "Add Intervention"
3. Select intervention type
4. Optional: add notes (e.g., "10mg", "2 puffs Pineapple Express")
5. Save

### Resolving Event

1. Open event detail
2. Tap "Resolved"
3. Optional: add closing notes
4. `ended_at` is set, event closed

### Bowel Movement Flow

1. Tap Bowel Movement
2. Select duration (Quick/Normal/Extended)
3. Select consistency (Hard/Normal/Loose)
4. Enter flush count
5. Save (no open/close lifecycle needed, but has_duration is true for tracking time spent)

---

## Project Structure (Proposed)

```
my-ms-event-tracker/
├── .claude/
│   └── project.md              # Project context for Claude Code
├── .github/
│   └── workflows/
│       └── deploy.yml          # Cloudflare Pages deployment
├── src/
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── types.ts            # TypeScript types from schema
│   │   └── components/
│   │       ├── EventCard.svelte
│   │       ├── QuickLog.svelte
│   │       ├── SeveritySlider.svelte
│   │       └── LocationPicker.svelte
│   └── routes/
│       ├── +layout.svelte      # Auth wrapper
│       ├── +page.svelte        # Home / quick log
│       ├── api/
│       │   └── events/
│       │       ├── quick-log/
│       │       │   └── +server.ts    # POST - create event (for HA)
│       │       └── [id]/
│       │           ├── intervention/
│       │           │   └── +server.ts # POST - add intervention
│       │           └── resolve/
│       │               └── +server.ts # POST - resolve event
│       ├── events/
│       │   └── [id]/
│       │       └── +page.svelte # Event detail
│       ├── history/
│       │   └── +page.svelte    # Event history / export
│       └── admin/
│           └── +page.svelte    # Manage event types, locations, interventions
├── static/
├── .env.example
├── .gitignore
├── devbox.json
├── package.json
├── svelte.config.js
├── tsconfig.json
└── README.md
```

---

## GitHub Actions - Cloudflare Pages Deployment

The deployment workflow triggers on push to `main` and deploys to Cloudflare Pages.

### Required GitHub Secrets

Configure these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Description | Where to find |
|--------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages edit permission | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → any domain → Overview (right sidebar) |

### Workflow File

**`.github/workflows/deploy.yml`**

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ vars.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy build --project-name=my-ms-event-tracker
```

### GitHub Variables (non-secret)

Configure in GitHub → Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
|----------|-------|
| `PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` |

### GitHub Secrets

| Secret | Value |
|--------|-------|
| `PUBLIC_SUPABASE_ANON_KEY` | The anon key (treat as secret even though it's technically public) |
| `CLOUDFLARE_API_TOKEN` | From Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | From Cloudflare |

---

## GitHub Issues to Create

### Phase 1: Infrastructure

1. **Initialize SvelteKit project with Devbox**
   - Create devbox.json with Node.js 20
   - Initialize SvelteKit with TypeScript
   - Configure Cloudflare adapter
   - Create .env.example
   - Add .gitignore

2. **Run Supabase schema migration**
   - Execute SQL script in Supabase SQL Editor
   - Verify tables and seed data
   - Document in README

3. **Configure Supabase Auth with Google**
   - Set up Google OAuth in Supabase
   - Create auth callback route
   - Implement login/logout UI

4. **Set up GitHub Actions for Cloudflare Pages deployment**
   - Create .github/workflows/deploy.yml
   - Configure GitHub secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
   - Configure GitHub variables (PUBLIC_SUPABASE_URL)
   - Create Cloudflare Pages project
   - Verify deployment pipeline

5. **Connect Cloudflare Pages to GitHub**
   - Create Cloudflare Pages project named `my-ms-event-tracker`
   - Verify automatic deployment on push to main

### Phase 2: Core Features

6. **Create Supabase client and types**
   - Initialize Supabase JS client
   - Generate TypeScript types from schema
   - Create helper functions for common queries

7. **Build quick log home screen**
   - Event type buttons (Spasm, Pain, Bowel)
   - Active event banner
   - Recent events list

8. **Implement spasm/pain logging flow**
   - Location picker (multi-select)
   - Severity slider (1-10)
   - Save to database

9. **Implement intervention logging**
   - Add intervention to open event
   - Notes field
   - Timestamp

10. **Implement event resolution**
    - Mark event as resolved
    - Set ended_at timestamp
    - Optional closing notes

11. **Implement bowel movement logging**
    - Duration select
    - Consistency select
    - Flush count input

### Phase 3: History & Export

12. **Build event history view**
    - Filterable list of past events
    - Date range picker
    - Event type filter

13. **Implement CSV/Excel export**
    - Generate spreadsheet from events
    - Include all related data (locations, interventions)
    - Download button

### Phase 4: Admin

14. **Build admin interface**
    - Manage event types
    - Manage body locations
    - Manage interventions
    - Add/edit/deactivate

---

## Development Workflow

Follow the same workflow as the MS Wellness Guide project:

1. **Every change needs a GitHub Issue**
2. **Feature branches only** - Never commit to main directly
3. **Local review before commit** - `devbox run dev`
4. **PR for every change** - Merge commit (no squash), delete branch
5. **Environment variables in .env** - Never commit secrets

---

## Commands Reference

```bash
# Enter dev environment
devbox shell

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy (automatic via Cloudflare on push to main)
git push origin main
```

---

## Notes

- **Single user app** - Auth is just to secure the data, not multi-tenancy
- **Mobile-first** - Primary use will be on phone during spasm episodes
- **Offline not required** - WiFi/cellular assumed available
- **Learning project** - The owner is learning frontend development, so clear code and good patterns matter

---

## API Extensibility (Home Assistant Integration)

The architecture supports external API access for future Home Assistant voice integration.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Home Assistant │     │ Cloudflare Pages│     │    Supabase     │
│  Voice Trigger  │────▶│  /api/log       │────▶│    Database     │
│  "Log a spasm"  │     │  (SvelteKit)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### API Endpoint Design

**POST `/api/events/quick-log`**

Request:
```json
{
  "type": "muscle-spasm",
  "locations": ["left-quad", "left-hamstring"],
  "severity": 7,
  "notes": "from voice"
}
```

Response:
```json
{
  "success": true,
  "event_id": "uuid-here",
  "message": "Logged muscle spasm at severity 7"
}
```

**POST `/api/events/{id}/intervention`**

Request:
```json
{
  "intervention": "oral-baclofen",
  "notes": "10mg"
}
```

**POST `/api/events/{id}/resolve`**

Request:
```json
{
  "notes": "Resolved after baclofen"
}
```

### Authentication for API

Two options:

1. **API Key (simpler)** - Bearer token stored in HA secrets
2. **Supabase Service Role** - More secure, requires server-side handling

For initial implementation, API key is sufficient for a single-user app.

### Database Addition for API Keys

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
ON api_keys FOR ALL USING (auth.uid() = user_id);
```

### Home Assistant Configuration Example

```yaml
# configuration.yaml
rest_command:
  health_log_spasm:
    url: "https://my-ms-event-tracker.pages.dev/api/events/quick-log"
    method: POST
    headers:
      Authorization: "Bearer {{ states('input_text.health_tracker_api_key') }}"
      Content-Type: "application/json"
    payload: '{"type": "muscle-spasm", "locations": {{ locations | to_json }}, "severity": {{ severity }}}'

# automations.yaml
automation:
  - alias: "Voice: Log Left Leg Spasm"
    trigger:
      - platform: conversation
        command:
          - "log a spasm"
          - "log spasm"
          - "having a spasm"
    action:
      - service: rest_command.health_log_spasm
        data:
          locations: ["left-quad"]
          severity: 5
      - service: tts.speak
        data:
          message: "Logged spasm"
```

### Future Enhancement: Voice with Location/Severity

More sophisticated HA automation could parse voice input:

- "Log a severe left quad spasm" → `severity: 8, locations: ["left-quad"]`
- "Log mild shoulder pain" → `type: "pain-episode", severity: 3, locations: ["left-shoulder"]`

This would require custom intent handling in Home Assistant or a more advanced voice assistant integration.

### GitHub Issue for API (Phase 5)

This is a future phase after core functionality is complete:

15. **Implement API endpoints for external access**
    - POST /api/events/quick-log
    - POST /api/events/{id}/intervention
    - POST /api/events/{id}/resolve
    - API key generation in admin UI
    - Bearer token authentication middleware

16. **Document Home Assistant integration**
    - Example configuration.yaml
    - Example automations
    - Setup guide
