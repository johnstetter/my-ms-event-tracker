# Environment Variables Guide

This guide covers how environment variables are managed across different deployment environments for the MS Symptom Tracker application.

## Overview

Environment variables are used to configure the application for different environments (local development, staging, production) without hardcoding sensitive values or environment-specific settings.

---

## Variable Types

### Public Variables

These variables are prefixed with `PUBLIC_` and are exposed to the client-side code. They are included in the browser bundle and are not sensitive.

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project-ref.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `your-anon-key-here` |
| `NODE_ENV` | Environment type | `development`, `production` |

### Private Variables (Future)

These variables are server-side only and never exposed to the client:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (if needed) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `API_SECRET_KEY` | API encryption secret | `your-secret-key-here` |

---

## Environment Configurations

### Local Development

**File**: `.env` (gitignored)

```bash
# Local Supabase instance
PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key-from-supabase-start

# Environment type
NODE_ENV=development
```

**Setup**:
1. Copy from example: `cp .env.example .env`
2. Start Supabase: `supabase start`
3. Use local keys provided by Supabase CLI

### Staging Environment (Optional)

**File**: GitHub Secrets with `_STAGING` suffix

```bash
# Staging Supabase instance (if you have one)
PUBLIC_SUPABASE_URL_STAGING=https://staging-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY_STAGING=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...staging-key

NODE_ENV=staging
```

**Usage**: Automatically used for pull request preview deployments.

### Production Environment

**Storage**: GitHub Secrets and Variables

```bash
# Production Supabase instance
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

NODE_ENV=production
```

---

## Configuration by Platform

### GitHub Actions

Environment variables are configured in GitHub repository settings:

#### Secrets (Sensitive Data)
**Location**: Repository Settings → Secrets and Variables → Actions → Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Treated as secret even though technically public |
| `CLOUDFLARE_API_TOKEN` | API token | For deployment automation |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | For deployment automation |

#### Variables (Non-Sensitive)
**Location**: Repository Settings → Secrets and Variables → Actions → Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | Production URL | Public Supabase project URL |

#### Staging Secrets (Optional)
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `PUBLIC_SUPABASE_URL_STAGING` | Staging URL | For preview deployments |
| `PUBLIC_SUPABASE_ANON_KEY_STAGING` | Staging key | For preview deployments |

### Cloudflare Pages

Environment variables are set in Cloudflare Pages dashboard:

**Location**: Cloudflare Dashboard → Pages → Project → Settings → Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | Production URL | Production |
| `PUBLIC_SUPABASE_ANON_KEY` | Production key | Production |
| `NODE_ENV` | `production` | Production |

**Note**: Variables set in GitHub Actions take precedence during build time.

### Local `.env` Files

**Development**:
- `.env` - Current environment configuration (gitignored)
- `.env.example` - Template for production environment
- `.env.local.example` - Template for local development

**Best Practices**:
- Never commit `.env` files to git
- Always provide example files for setup
- Use helper scripts to switch environments

---

## Environment Switching

### Helper Scripts

The project includes scripts to switch between environments:

#### `scripts/use-local.sh`
```bash
#!/bin/bash
# Switch to local development environment
cp .env.local.example .env
echo "Switched to local development environment"
echo "PUBLIC_SUPABASE_URL=http://127.0.0.1:54421"
```

#### `scripts/use-production.sh`
```bash
#!/bin/bash
# Switch to production environment
cp .env.example .env
echo "Switched to production environment"
echo "PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co"
```

#### `scripts/check-env.sh`
```bash
#!/bin/bash
# Check current environment configuration
echo "Current environment configuration:"
echo "PUBLIC_SUPABASE_URL=$(grep PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)"
echo "NODE_ENV=$(grep NODE_ENV .env | cut -d '=' -f2 || echo 'not set')"

if grep -q "127.0.0.1" .env; then
    echo "Environment: LOCAL DEVELOPMENT"
else
    echo "Environment: PRODUCTION"
fi
```

### Usage

```bash
# Switch to local development
./scripts/use-local.sh
supabase start
npm run dev

# Switch to production (for testing)
./scripts/use-production.sh
npm run dev

# Check current environment
./scripts/check-env.sh
```

---

## Security Best Practices

### What to Keep Secret

**Always Secret**:
- Service role keys
- Cloudflare API tokens
- Database passwords
- API secret keys

**Technically Public but Treat as Secret**:
- Supabase anonymous keys (included in client bundle but don't commit)
- Project URLs (public but don't hardcode)

### What's Safe to Expose

**Public by Design**:
- Supabase project URLs
- Public API endpoints
- CDN URLs
- Non-sensitive configuration flags

### Git Security

**`.gitignore` entries**:
```gitignore
# Environment variables
.env
.env.local
.env.production

# Supabase local config
.supabase/

# Logs
*.log
```

**Never commit**:
- `.env` files with real values
- Service role keys
- API secrets
- Local Supabase configuration

### Key Rotation

**Regular Rotation**:
- Rotate Supabase keys annually
- Rotate Cloudflare API tokens annually
- Update GitHub Secrets when keys change

**Emergency Rotation**:
- If keys are accidentally committed to git
- If keys are suspected to be compromised
- When team members leave (for service keys)

---

## Validation and Testing

### Environment Validation

**Startup Checks**:
```javascript
// src/lib/env.ts
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables');
}

if (PUBLIC_SUPABASE_URL.includes('127.0.0.1')) {
  console.log('🚀 Running in local development mode');
} else {
  console.log('🌐 Running in production mode');
}
```

### Testing Different Environments

**Local Testing**:
```bash
# Test local environment
./scripts/use-local.sh
supabase start
npm run dev
# Verify connection to http://127.0.0.1:54421

# Test production environment
./scripts/use-production.sh
npm run dev
# Verify connection to production Supabase
```

**Build Testing**:
```bash
# Test production build with local environment
./scripts/use-local.sh
npm run build
npm run preview

# Test production build with production environment
./scripts/use-production.sh
npm run build
npm run preview
```

---

## Troubleshooting

### Common Issues

#### Missing Environment Variables

**Error**: `PUBLIC_SUPABASE_URL is not defined`

**Solutions**:
1. Check `.env` file exists: `ls -la .env`
2. Verify file contents: `cat .env`
3. Restart development server: `npm run dev`
4. Use helper scripts: `./scripts/check-env.sh`

#### Wrong Environment

**Symptoms**: Auth works locally but fails in production

**Solutions**:
1. Check current environment: `./scripts/check-env.sh`
2. Verify URL in browser dev tools
3. Switch environments: `./scripts/use-production.sh`

#### GitHub Actions Failures

**Error**: Build fails with environment variable errors

**Solutions**:
1. Check GitHub Secrets are configured
2. Verify secret names match workflow file
3. Ensure variables are set as Variables (not Secrets) for public data

### Debugging Environment Issues

**Browser Console**:
```javascript
// Check what environment variables are loaded
console.log('PUBLIC_SUPABASE_URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('NODE_ENV:', import.meta.env.NODE_ENV);
```

**Server Logs**:
```javascript
// Add to SvelteKit load functions
console.log('Server environment:', {
  url: PUBLIC_SUPABASE_URL,
  env: NODE_ENV
});
```

**Build Verification**:
```bash
# Check built files contain correct URLs
grep -r "supabase" .svelte-kit/output/
```

---

## Related Documentation

- **[Development Environment](../setup/development-environment.md)**: Local development setup
- **[Cloudflare Pages Deployment](cloudflare-pages.md)**: Production deployment
- **[OAuth Setup](../setup/oauth-setup.md)**: Authentication configuration
- **[Troubleshooting](../troubleshooting.md)**: Common issues and solutions