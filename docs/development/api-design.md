# API Design for External Integration

> **Status: PLANNED, NOT IMPLEMENTED.** The endpoints below describe a designed-but-unbuilt external API for Home Assistant voice integration. None of `/api/events/*` exists in the current source tree. This doc is preserved as design intent for whoever picks the integration up.

This document describes the external API endpoints designed for Home Assistant voice integration and other external systems. These endpoints enable programmatic event logging and management.

## Overview

The API is designed to support voice commands like "Log a spasm" or "Add baclofen to my current episode" through Home Assistant or other automation systems. All endpoints would require authentication via API keys and respect the same Row Level Security policies as the web interface.

When implemented, the `quick-log` endpoint should accept the new mental-health event type slugs (`panic-attack`, `anxiety`, `intrusive-thought`) without code changes — they're regular rows in `event_types`. The intervention picker filtering (universal-by-default scope tags) is a UI-only concern and would not affect API event creation.

---

## Authentication

### API Key System

API keys are generated through the admin interface and stored securely in the `api_keys` table:

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,                     -- "Home Assistant", "Mobile App"
  key_hash TEXT NOT NULL,                -- Hashed API key for security
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ                 -- NULL = active
);
```

### Authentication Headers

All API requests require a Bearer token in the Authorization header:

```http
Authorization: Bearer your_api_key_here
Content-Type: application/json
```

### Security Features

- **Hashed Storage**: API keys are hashed before storage (never stored in plaintext)
- **User Scoped**: Each key belongs to a specific user and can only access their data
- **Revocable**: Keys can be marked as revoked without deletion (audit trail)
- **Activity Tracking**: `last_used_at` timestamp for monitoring usage

---

## Core Endpoints

### POST `/api/events/quick-log`

Create a new event quickly (primary endpoint for voice commands).

**Use Case**: "Hey Google, log a muscle spasm"

#### Request Body
```json
{
  "type": "muscle-spasm",              // Event type slug
  "locations": ["left-quad", "left-hamstring"],  // Optional body locations
  "severity": 7,                       // Optional severity (1-10)
  "notes": "from voice command",       // Optional notes
  "started_at": "2024-01-15T14:30:00Z" // Optional, defaults to now()
}
```

#### Response (Success)
```json
{
  "success": true,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Logged muscle spasm at severity 7",
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "muscle-spasm",
    "started_at": "2024-01-15T14:30:00Z",
    "severity": 7,
    "locations": ["Left Quad", "Left Hamstring"],
    "status": "open"
  }
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "Invalid event type: invalid-type",
  "details": {
    "valid_types": ["muscle-spasm", "pain-episode", "bowel-movement"]
  }
}
```

#### Implementation Notes
- Event type must exist and be active
- Body locations are validated against `body_locations` table
- Severity is optional and validated (1-10 range)
- Creates `event_locations` records for each specified location
- Returns human-readable location names in response

---

### POST `/api/events/{id}/intervention`

Add an intervention to an existing event.

**Use Case**: "Hey Google, add baclofen to my current spasm"

#### Request Body
```json
{
  "intervention": "oral-baclofen",     // Intervention slug/ID
  "notes": "10mg",                     // Optional dosage/notes
  "applied_at": "2024-01-15T14:45:00Z" // Optional, defaults to now()
}
```

#### Response (Success)
```json
{
  "success": true,
  "intervention_id": "440e7300-d19a-31c3-9616-336655440000",
  "message": "Added Oral Baclofen intervention",
  "intervention": {
    "id": "440e7300-d19a-31c3-9616-336655440000",
    "intervention": "Oral Baclofen",
    "notes": "10mg",
    "applied_at": "2024-01-15T14:45:00Z"
  }
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "Event not found or access denied",
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Implementation Notes
- Event must exist and belong to the authenticated user
- Event must be "open" (not resolved)
- Intervention must exist and be active
- Creates record in `event_interventions` table

---

### POST `/api/events/{id}/resolve`

Mark an event as resolved (closed).

**Use Case**: "Hey Google, resolve my current spasm"

#### Request Body
```json
{
  "notes": "Resolved after baclofen and stretching", // Optional closing notes
  "ended_at": "2024-01-15T15:15:00Z"                // Optional, defaults to now()
}
```

#### Response (Success)
```json
{
  "success": true,
  "message": "Event resolved",
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "muscle-spasm",
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": "2024-01-15T15:15:00Z",
    "duration_minutes": 45,
    "status": "resolved"
  }
}
```

#### Response (Error)
```json
{
  "success": false,
  "error": "Event is already resolved",
  "event_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Implementation Notes
- Event must exist and belong to the authenticated user
- Event must be "open" (not already resolved)
- Sets `ended_at` timestamp
- Appends resolution notes to existing notes (if any)

---

## Helper Endpoints

### GET `/api/events/active`

Get current open (unresolved) events for the authenticated user.

**Use Case**: "What's my current spasm status?"

#### Response
```json
{
  "success": true,
  "active_events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "muscle-spasm",
      "type_name": "Muscle Spasm",
      "started_at": "2024-01-15T14:30:00Z",
      "duration_minutes": 45,
      "severity": 7,
      "locations": ["Left Quad", "Left Hamstring"],
      "intervention_count": 2,
      "last_intervention": "Oral Baclofen"
    }
  ],
  "count": 1
}
```

#### Implementation Notes
- Returns events where `ended_at IS NULL`
- Includes calculated duration and intervention summary
- Ordered by `started_at DESC`

---

### GET `/api/reference`

Get reference data (event types, body locations, interventions) for building voice commands.

#### Response
```json
{
  "success": true,
  "reference_data": {
    "event_types": [
      {"slug": "muscle-spasm", "name": "Muscle Spasm", "icon": "⚡"},
      {"slug": "pain-episode", "name": "Pain Episode", "icon": "🔥"},
      {"slug": "bowel-movement", "name": "Bowel Movement", "icon": "💩"}
    ],
    "body_locations": [
      {"slug": "left-quad", "name": "Left Quad", "region": "Lower Body"},
      {"slug": "right-quad", "name": "Right Quad", "region": "Lower Body"},
      {"slug": "si-joint", "name": "SI Joint", "region": "Core"}
    ],
    "interventions": [
      {"slug": "oral-baclofen", "name": "Oral Baclofen", "category": "Medication"},
      {"slug": "cannabis-vaporizer", "name": "Cannabis - Vaporizer", "category": "Medication"},
      {"slug": "stretching", "name": "Stretching", "category": "Physical"}
    ]
  }
}
```

#### Implementation Notes
- Returns only active reference data
- Slugs can be used in API calls
- Useful for configuring Home Assistant automations

---

## Home Assistant Integration

### Configuration Example

```yaml
# configuration.yaml
rest_command:
  health_log_spasm:
    url: "https://my-ms-event-tracker.pages.dev/api/events/quick-log"
    method: POST
    headers:
      Authorization: "Bearer {{ states('input_text.health_tracker_api_key') }}"
      Content-Type: "application/json"
    payload: >
      {
        "type": "muscle-spasm",
        "locations": {{ locations | default(["left-quad"]) | to_json }},
        "severity": {{ severity | default(5) }},
        "notes": "from voice command"
      }

  health_add_intervention:
    url: "https://my-ms-event-tracker.pages.dev/api/events/{{ event_id }}/intervention"
    method: POST
    headers:
      Authorization: "Bearer {{ states('input_text.health_tracker_api_key') }}"
      Content-Type: "application/json"
    payload: >
      {
        "intervention": "{{ intervention }}",
        "notes": "{{ notes | default('') }}"
      }

# Store API key securely
input_text:
  health_tracker_api_key:
    name: Health Tracker API Key
    mode: password
```

### Voice Automation Examples

```yaml
# automations.yaml
automation:
  # Simple spasm logging
  - alias: "Voice: Log Spasm"
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
          message: "Logged muscle spasm"

  # Add baclofen intervention to most recent open event
  - alias: "Voice: Add Baclofen"
    trigger:
      - platform: conversation
        command:
          - "add baclofen"
          - "took baclofen"
    action:
      - service: rest_command.health_add_intervention
        data:
          event_id: "{{ state_attr('sensor.active_spasm', 'event_id') }}"
          intervention: "oral-baclofen"
          notes: "10mg"
      - service: tts.speak
        data:
          message: "Added baclofen intervention"

  # More sophisticated parsing
  - alias: "Voice: Advanced Spasm Logging"
    trigger:
      - platform: conversation
        command:
          - "log ([a-z ]+) (spasm|pain) severity ([0-9]+)"
    action:
      - service: rest_command.health_log_spasm
        data:
          type: "{{ 'muscle-spasm' if 'spasm' in trigger.slots.command else 'pain-episode' }}"
          locations: ["{{ trigger.slots.command.split()[1] }}-{{ trigger.slots.command.split()[2] }}"]
          severity: "{{ trigger.slots.command.split()[-1] | int }}"
      - service: tts.speak
        data:
          message: "Logged {{ trigger.slots.command }}"
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Brief error description",
  "details": {
    "field": "Additional context",
    "suggestions": ["Possible solutions"]
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Common Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | API key revoked or insufficient permissions |
| 404 | Not Found | Event, intervention, or resource doesn't exist |
| 422 | Unprocessable Entity | Validation errors in request data |
| 429 | Too Many Requests | Rate limiting (if implemented) |
| 500 | Internal Server Error | Unexpected server error |

### Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "severity": "Must be between 1 and 10",
    "type": "Invalid event type 'invalid-type'. Valid types: muscle-spasm, pain-episode, bowel-movement",
    "locations": "Invalid location 'invalid-location'. Use /api/reference to get valid locations"
  }
}
```

---

## Rate Limiting

### Implementation
- **Bucket**: 100 requests per hour per API key
- **Reset**: Rolling window
- **Headers**: Include rate limit info in responses

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642267800
```

### Exceeded Rate Limit
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "reset_at": "2024-01-15T15:30:00Z"
  }
}
```

---

## Implementation Notes

### SvelteKit API Routes

API endpoints are implemented as SvelteKit server-side routes:

```
src/routes/api/
├── events/
│   ├── quick-log/
│   │   └── +server.ts           # POST /api/events/quick-log
│   ├── active/
│   │   └── +server.ts           # GET /api/events/active
│   └── [id]/
│       ├── intervention/
│       │   └── +server.ts       # POST /api/events/{id}/intervention
│       └── resolve/
│           └── +server.ts       # POST /api/events/{id}/resolve
└── reference/
    └── +server.ts               # GET /api/reference
```

### Authentication Middleware

```typescript
// src/lib/api/auth.ts
export async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header');
  }

  const apiKey = authHeader.substring(7);
  const keyHash = await hashApiKey(apiKey);

  const { data: keyRecord } = await supabase
    .from('api_keys')
    .select('user_id, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (!keyRecord || keyRecord.revoked_at) {
    throw new ApiError(401, 'Invalid or revoked API key');
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash);

  return keyRecord.user_id;
}
```

---

## Future Enhancements

### Webhook Support

Add webhook endpoints for real-time notifications:

```
POST /api/webhooks/event-created
POST /api/webhooks/event-resolved
```

### Bulk Operations

Support for batch logging:

```
POST /api/events/bulk
```

### Advanced Query API

Rich querying for analytics:

```
GET /api/events/query?start=2024-01-01&type=muscle-spasm&location=left-quad
```

---

## Related Documentation

- **[Database Schema](database-schema.md)**: Complete database structure
- **[Developer Guide](developer-guide.md)**: Architecture and development guidelines
- **[Home Assistant Integration Guide](../integration/home-assistant.md)**: Complete HA setup *(Future)*