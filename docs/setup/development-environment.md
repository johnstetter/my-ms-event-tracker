# Development Environment Guide

## Environment Overview

This project uses a **local-first development** approach with proper environment separation:

- **Local Development**: Full Supabase stack running in Docker containers
- **Production**: Remote Supabase project for deployed app

## Quick Start

### 1. Local Development Setup

```bash
# Enter development environment
devbox shell

# Start local Supabase (includes database, auth, storage, etc.)
supabase start

# Copy local environment config
cp .env.local.example .env

# Install dependencies (when you add package.json)
npm install

# Start development server (when you add SvelteKit)
npm run dev
```

### 2. Local Development URLs

Once `supabase start` is running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Studio** | http://127.0.0.1:54423 | Database management UI |
| **API** | http://127.0.0.1:54421 | Local Supabase API |
| **Mailpit** | http://127.0.0.1:54424 | Email testing (auth emails) |

### 3. Environment Configuration

#### Local Development (`.env`)
```bash
# Uses local Supabase instance
PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
NODE_ENV=development
```

#### Production (Cloudflare Pages Environment Variables)
```bash
# Uses remote Supabase project
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NODE_ENV=production
```

## Database Management

### Local Development
- **Browse Data**: Open http://127.0.0.1:54423 (Supabase Studio)
- **Reset Database**: `supabase db reset` (applies all migrations fresh)
- **Add Migration**: `supabase migration new <name>`
- **Apply Migration**: Automatically applied on `supabase start`

### Production
- **Browse Data**: https://supabase.com/dashboard/project/your-project-ref
- **Apply Migration**: `supabase db push`
- **Environment**: Use SUPABASE_ACCESS_TOKEN for CLI access

## Development Workflow

### 1. Daily Development
```bash
# Start your day
devbox shell
supabase start

# Your app now uses local database with all your schema + seed data
# Make changes, test locally, commit when ready
```

### 2. Making Schema Changes
```bash
# Create new migration
supabase migration new add_new_feature

# Edit the migration file in supabase/migrations/
# Test locally (migration auto-applies on start)

# When ready, apply to production
export SUPABASE_ACCESS_TOKEN="your_token"
supabase db push
```

### 3. Stopping Local Environment
```bash
# Stop local Supabase when done
supabase stop
```

## Benefits of This Setup

✅ **Fast Development**: No network latency, work offline
✅ **Safe Testing**: Local changes don't affect production
✅ **Realistic Environment**: Same Supabase stack as production
✅ **Easy Reset**: Start fresh anytime with `supabase db reset`
✅ **Version Control**: All schema changes tracked in migrations

## Production Deployment

When you push to `main` branch:
1. GitHub Actions builds the SvelteKit app
2. Deploys to Cloudflare Pages
3. Uses production Supabase environment variables
4. Connects to remote database

## Troubleshooting

### Local Supabase Won't Start
```bash
# Check Docker is running
docker ps

# Reset local environment
supabase stop
supabase start
```

### Migration Issues
```bash
# Reset local database to clean state
supabase db reset

# Check migration status
supabase migration list
```

### Environment Variable Issues
```bash
# Verify your .env file
cat .env

# Should show local URLs for development
# Should show remote URLs for production
```

## Next Steps

1. **Add SvelteKit**: Initialize the frontend framework
2. **Add Authentication**: Configure Google OAuth
3. **Build UI Components**: Start with quick logging interface
4. **Test Locally**: Use Studio UI to verify data flow
5. **Deploy**: Push to main for production deployment

Your database is ready with all tables, RLS policies, and seed data in both environments!