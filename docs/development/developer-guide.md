# Developer Guide: MS Symptom Tracker

## Project Overview

**MS Symptom Tracker** is a personal health event tracking application built for people living with Multiple Sclerosis. The application prioritizes **fast symptom capture** during muscle spasms and pain episodes, with the ability to add interventions and mark events as resolved later.

### Key Requirements
- **5-second logging**: Quick capture when a spasm hits
- **Comprehensive tracking**: Location, severity, interventions, resolution
- **Data export**: CSV/Excel for medical providers
- **Future extensibility**: Home Assistant voice integration
- **Learning project**: Clean code and modern patterns for frontend development

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SvelteKit     │────▶│ Cloudflare Pages│────▶│   Supabase      │
│   Frontend      │     │   (Hosting)     │     │  (Database)     │
│                 │     │                 │     │                 │
│  - Quick Log UI │     │  - Static Build │     │  - PostgreSQL   │
│  - Event Mgmt   │     │  - Environment  │     │  - Auth (Google)│
│  - Export       │     │    Variables    │     │  - RLS Policies │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐                                      │
│ Home Assistant  │──────────────────────────────────────┘
│ Voice Commands  │              Future API Integration
│ "Log a spasm"   │              POST /api/events/quick-log
└─────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose | Notes |
|-------|------------|---------|-------|
| **Frontend** | SvelteKit | Modern reactive framework | Static build for Cloudflare Pages |
| **Testing** | Vitest | Unit & integration testing | Happy-dom environment, 70% coverage |
| **Hosting** | Cloudflare Pages | CDN + edge deployment | Free tier, git-based deployment |
| **Database** | Supabase PostgreSQL | Backend as a service | Free tier, auto-generated REST API |
| **Authentication** | Supabase Auth | Google OAuth | Single user |
| **Development** | Devbox | Reproducible environment | Nix-based package management |
| **Version Control** | GitHub | Code + deployment pipeline | Issues, PRs, GitHub Actions |

---

## Project Structure

```
my-ms-event-tracker/
├── .claude/
│   └── project.md                    # Project context for Claude Code
├── .github/
│   └── workflows/
│       └── deploy.yml                # Cloudflare Pages deployment
├── docs/                             # Documentation
│   ├── setup/
│   ├── development/
│   └── deployment/
├── src/                              # SvelteKit application
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client
│   │   ├── stores/                  # Svelte stores
│   │   │   └── auth.ts             # Authentication state
│   │   └── components/
│   │       ├── AuthButton.svelte    # Authentication UI
│   │       ├── QuickLog.svelte
│   │       ├── SeveritySlider.svelte
│   │       └── LocationPicker.svelte
│   └── routes/
│       ├── +layout.svelte           # Auth wrapper
│       ├── +page.svelte             # Home / quick log
│       ├── auth/
│       │   └── callback/
│       │       └── +page.svelte     # OAuth callback
│       ├── api/
│       │   └── events/
│       │       ├── quick-log/
│       │       │   └── +server.ts   # POST - create event (for HA)
│       │       └── [id]/
│       │           ├── intervention/
│       │           │   └── +server.ts # POST - add intervention
│       │           └── resolve/
│       │               └── +server.ts # POST - resolve event
│       ├── events/
│       │   └── [id]/
│       │       └── +page.svelte     # Event detail
│       ├── history/
│       │   └── +page.svelte         # Event history / export
│       └── admin/
│           ├── +layout.svelte       # Admin navigation layout
│           ├── +page.svelte         # Admin dashboard with statistics
│           ├── event-types/
│           │   ├── +page.svelte     # Event types list
│           │   ├── new/+page.svelte # Create event type
│           │   └── [id]/+page.svelte # Edit/delete event type
│           ├── body-locations/
│           │   ├── +page.svelte     # Body locations list
│           │   ├── new/+page.svelte # Create body location
│           │   └── [id]/+page.svelte # Edit/delete body location
│           └── interventions/
│               ├── +page.svelte     # Interventions list
│               ├── new/+page.svelte # Create intervention
│               └── [id]/+page.svelte # Edit/delete intervention
├── supabase/
│   ├── config.toml                  # Local development config
│   └── migrations/
│       └── 20260131050834_initial_health_tracker_schema.sql
├── static/                          # Static assets
├── .env.example                     # Production environment template
├── .env.local.example               # Local development template
├── .gitignore                       # Git ignore rules
├── devbox.json                      # Development environment config
├── package.json                     # Node.js dependencies
├── svelte.config.js                 # SvelteKit configuration
└── README.md                        # Project overview
```

---

## Frontend Development Guidelines

### UI Design Principles

#### Mobile-First Approach
The primary use case is logging spasms quickly on a mobile phone:

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

#### Component Architecture

**Core Components**:
- `QuickLog.svelte`: Event type selection (home screen)
- `LocationPicker.svelte`: Multi-select body locations
- `SeveritySlider.svelte`: 1-10 severity rating
- `EventCard.svelte`: Display event summary
- `InterventionLog.svelte`: Add interventions to events
- `EventDetail.svelte`: Full event view with interventions

**Layout Components**:
- `+layout.svelte`: Authentication wrapper
- `AuthButton.svelte`: Sign in/out with Google
- `ActiveEventBanner.svelte`: Shows ongoing events

### User Flow Implementation

#### 1. Quick Spasm/Pain Logging (5-second target)
```
Tap Event Type → Select Location(s) → Set Severity → Save
     (1s)            (2s)               (1s)       (1s)
```

#### 2. Adding Interventions (Later)
```
Active Event Banner → Add Intervention → Select Type → Add Notes → Save
```

#### 3. Resolving Events
```
Event Detail → Mark Resolved → Optional Notes → Save
```

#### 4. Bowel Movement Logging
```
Tap Bowel → Duration → Consistency → Flush Count → Save
```

---

## Admin Interface

### Overview

The Admin Interface provides complete CRUD (Create, Read, Update, Delete) operations for customizing the tracking entities used throughout the application. Located at `/admin`, it enables users to:

- **Custom Event Types**: Create event types with configurable tracking properties (severity, location, duration), plus a multi-select scope-tag editor for picking which user-owned interventions appear in this event type's picker
- **Body Locations**: Organize body locations by anatomical region
- **Interventions**: Manage interventions by category (Medication, Physical, Mental Health, Alternative, Lifestyle, Other), with a symmetric multi-select for which event types this intervention applies to

### Architecture

**Pattern-Based Implementation**: All admin forms follow consistent patterns for maintainability and user experience:

```typescript
// Standard form state management
let saving = false;
let error: string | null = null;
let formData = { /* entity fields */ };

// Service integration through admin stores
const result = await entityAdmin.create(formData);
if (result.success) {
  goto('/admin/entity-list');
} else {
  error = result.error || 'Operation failed';
}
```

**Key Features**:
- **Form validation**: Required fields, unique names, data type validation
- **Loading states**: Disabled inputs and loading indicators during async operations
- **Preview sections**: Live preview showing how items appear in the application
- **Error handling**: User-friendly error messages with retry capabilities
- **Responsive design**: Mobile-friendly forms with touch-optimized controls

### Admin Store Pattern

Each entity (event types, body locations, interventions) uses the same store pattern:

```typescript
// Store structure (example: interventionsAdmin)
export const interventionsAdmin = {
  create: async (params) => { /* Creates new entity */ },
  update: async (id, params) => { /* Updates existing entity */ },
  delete: async (id, hardDelete) => { /* Soft/hard delete */ },
  getUserEntities: async (includeInactive) => { /* Fetches user's entities */ },
  reorder: async (entityIds) => { /* Updates sort order */ }
};
```

**Cache Management**: All stores implement automatic cache refresh after mutations to ensure UI consistency across the application.

### Route Structure

```
/admin/
├── +layout.svelte              # Navigation sidebar with entity counts
├── +page.svelte                # Dashboard with statistics and recent activity
├── event-types/
│   ├── +page.svelte            # List with inline actions (edit, delete, reorder)
│   ├── new/+page.svelte        # Create form with tracking property configuration
│   └── [id]/+page.svelte       # Edit form with delete confirmation dialog
├── body-locations/
│   ├── +page.svelte            # List grouped by region
│   ├── new/+page.svelte        # Create form with region selection
│   └── [id]/+page.svelte       # Edit form with active/inactive toggle
└── interventions/
    ├── +page.svelte            # List grouped by category
    ├── new/+page.svelte        # Create form with category selection
    └── [id]/+page.svelte       # Edit form with category management
```

### Integration Points

**Quick Log Integration**: Custom entities automatically appear in the Quick Log interface:
- Custom event types populate the event type selector
- Custom body locations appear in the location picker
- Custom interventions are available in the intervention dropdown, **filtered by the active event type's scope tags** (universal-by-default — see [Database Schema](database-schema.md#intervention_event_types))

**Scope-tag editor (`ScopeTagPicker.svelte`)**: a shared multi-select component used on both event-type and intervention admin pages. Both views write the same `intervention_event_types` join table, so editing from either side maintains a coherent M2M graph. Save sequencing is two-step: the entity create/update happens first, then `setScopeTagsForX` applies the tags. A failure on the second step surfaces as a non-blocking warning rather than rolling back the create — see `interventionScopeService.ts` for the rationale.

**Reactive Updates**: Changes in admin interface immediately reflect across the application through Svelte store subscriptions.

---

## Authentication & Security

### Current Implementation

The authentication system uses Supabase Auth with Google OAuth via `@supabase/ssr` (cookie-based sessions).

**Components**:
- `AuthButton.svelte`: Handles sign-in/sign-out UI
- `src/routes/auth/callback/+server.ts`: Server endpoint that exchanges the OAuth code for a session and sets cookies (replaced the previous client-only `+page.svelte` callback). Validates the `next` query param to prevent open-redirect phishing.
- `src/hooks.server.ts`: Per-request server Supabase client; populates `event.locals.user` and `event.locals.session` after JWT re-validation
- `src/routes/admin/+layout.server.ts`: Redirects unauthenticated requests away from `/admin/*` before any HTML renders
- `src/lib/stores/auth.ts`: Reactive auth state management on the client

**Security Features**:
- **Row Level Security (RLS)**: Users can only access their own data; system rows (`user_id IS NULL`) on `event_types`, `body_locations`, `interventions`, and `intervention_event_types` are visible to all authenticated users but only seed-time-mutable
- **Server-side route guards**: `/admin/*` is gated by a server load function — no markup leaks before client hydration
- **JWT re-validation**: `safeGetSession()` calls `getUser()` to verify the cookie payload rather than trusting it
- **Secure Redirects**: OAuth callback restricts the post-exchange redirect to same-origin paths

### External Setup Required

See [OAuth Setup Guide](../setup/oauth-setup.md) for detailed configuration steps:

1. **Google Cloud Console**: OAuth 2.0 credentials
2. **Supabase Dashboard**: Enable Google provider and configure redirects

---

## Development Workflow

### Issue-First Development

**Mandatory Process**:
1. **Create GitHub Issue**: Describe the feature or bug first
2. **Create Feature Branch**: `git checkout -b feature/123-description`
3. **Develop Locally**: Use local Supabase for safe testing
4. **Test Thoroughly**: Run `npm run test:run` and verify with local environment
5. **Create Pull Request**: Link to original issue
6. **Merge and Deploy**: Automatic deployment to Cloudflare Pages

### Commit Message Format

**Conventional Commits**:
```
type(scope): Brief description

Fixes #issue-number

Longer explanation if needed.
What changed and why.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `chore`

### Code Style

**TypeScript/JavaScript**:
- Use TypeScript for type safety
- Prefer functional components in Svelte
- ESLint and Prettier for consistent formatting

**Database**:
- Use descriptive table and column names
- Always include RLS policies for new tables
- Create indexes for anticipated query patterns

---

## Performance Considerations

### Database Optimization

**Query Patterns**:
```sql
-- Homepage: active events + recent events
SELECT * FROM events
WHERE user_id = $1 AND ended_at IS NULL
ORDER BY started_at DESC;

-- Event history with related data
SELECT e.*, et.name, et.icon,
  array_agg(bl.name) as locations,
  count(ei.id) as intervention_count
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN event_locations el ON e.id = el.event_id
LEFT JOIN body_locations bl ON el.body_location_id = bl.id
LEFT JOIN event_interventions ei ON e.id = ei.event_id
WHERE e.user_id = $1
GROUP BY e.id, et.name, et.icon
ORDER BY e.started_at DESC;
```

**Indexes**: See [Database Schema](database-schema.md) for index definitions.

### Frontend Performance

**SvelteKit Optimizations**:
- Static site generation where possible
- Lazy loading for history views
- Optimistic UI updates for quick logging
- Local caching of reference data (event types, locations)

**Mobile Optimization**:
- Touch-friendly UI elements (minimum 44px)
- Fast tap response (<100ms)
- Offline capability for critical functions
- Progressive Web App (PWA) features

---

## Data Export & Integration

### CSV Export Implementation

**Export Format**:
```csv
Event Date,Event Type,Duration,Severity,Body Locations,Interventions,Notes,Resolution Date,Resolution Notes
2024-01-15 14:30,Muscle Spasm,45 min,7,"Left Quad, Left Hamstring","Oral Baclofen (10mg), Stretching",Sharp spasm during transfer,2024-01-15 15:15,Resolved after baclofen
```

**Implementation Strategy**:
```typescript
// src/lib/export.ts
export async function exportToCSV(dateRange: { start: Date, end: Date }) {
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      event_type:event_types(name),
      event_locations(body_location:body_locations(name)),
      event_interventions(intervention:interventions(name), notes, applied_at)
    `)
    .gte('started_at', dateRange.start.toISOString())
    .lte('started_at', dateRange.end.toISOString())
    .order('started_at', { ascending: false })

  // Transform to CSV format...
}
```

### Medical Provider Reports

**Monthly Summary**:
- Event frequency by type
- Average severity ratings
- Most common body locations
- Intervention effectiveness
- Duration patterns

---

## Future Extensibility

### Home Assistant Integration

The architecture supports external API access for voice commands:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Home Assistant │     │ Cloudflare Pages│     │    Supabase     │
│  Voice Trigger  │────▶│  /api/log       │────▶│    Database     │
│  "Log a spasm"  │     │  (SvelteKit)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

See [API Design](api-design.md) for detailed endpoint specifications.

### Roadmap

> The phase-by-phase roadmap below was the original 2026-Q1 plan. The authoritative project status now lives in the [README](../../README.md#-current-status); the list here is preserved as a snapshot of the original phasing.

#### Phase 1: Core Infrastructure ✅
- [x] Database schema and migrations
- [x] Local development environment
- [x] Production Supabase setup
- [x] Google OAuth authentication

#### Phase 2: Core Features ✅
- [x] Quick symptom logging interface
- [x] Intervention tracking
- [x] Event resolution
- [x] Data export functionality

#### Phase 3: Advanced Features ✅
- [x] Event history and filtering
- [x] Admin interface for managing reference data
- [ ] Progressive Web App features

#### Phase 4: Foundation hardening + mental-health domain ✅
- [x] Server-side auth guards via `@supabase/ssr`
- [x] Component type tightening
- [x] Critical-path test coverage
- [x] Mental-health event types and context-aware intervention picker

#### Phase 5: External Integration & Enhancements
- [ ] API endpoints for Home Assistant
- [ ] Voice command integration
- [ ] Automated data backup
- [ ] Pattern analysis and statistics
- [ ] Doctor appointment integration

---

## Related Documentation

- **[Database Schema](database-schema.md)**: Complete database design and structure
- **[API Design](api-design.md)**: External API endpoints for integrations
- **[Development Environment](../setup/development-environment.md)**: Local setup guide
- **[OAuth Setup](../setup/oauth-setup.md)**: Authentication configuration
- **[Deployment Guide](../deployment/cloudflare-pages.md)**: Production deployment
- **[Troubleshooting](../troubleshooting.md)**: Common issues and solutions

---

## Conclusion

This developer guide provides the foundation for building and maintaining the MS Symptom Tracker application. The architecture prioritizes speed of use, data safety, and future extensibility while maintaining clean, understandable code.

Key principles:
- **Fast symptom capture** is the primary use case
- **Local development** environment mirrors production
- **Data security** through RLS and proper authentication
- **Extensible design** for future features and integrations
- **Professional workflow** for learning and code quality

The foundation is in place. Continue building the SvelteKit frontend with the quick logging interface that will make this tool valuable for daily symptom management.