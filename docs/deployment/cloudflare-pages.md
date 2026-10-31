# Cloudflare Pages Deployment Guide

This guide covers the automated deployment pipeline from GitHub to Cloudflare Pages using GitHub Actions.

## Overview

The deployment process is fully automated:
- **Push to `main`** → Production deployment
- **Pull requests** → Preview deployments
- **Environment variables** managed via GitHub Secrets

---

## GitHub Actions Pipeline

### Workflow File

The deployment workflow is defined in `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  NODE_VERSION: '20'

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Pages
    if: github.event_name == 'push'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run check
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}

      - name: Build application
        run: npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .svelte-kit/cloudflare --project-name=my-ms-event-tracker

  test:
    runs-on: ubuntu-latest
    name: Run Tests
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run check
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL_STAGING || secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY_STAGING || secrets.PUBLIC_SUPABASE_ANON_KEY }}

      - name: Build application (test)
        run: npm run build
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL_STAGING || secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY_STAGING || secrets.PUBLIC_SUPABASE_ANON_KEY }}

      - name: Test build output
        run: |
          if [ ! -d ".svelte-kit/cloudflare" ]; then
            echo "Build output directory not found!"
            exit 1
          fi
          echo "Build output created successfully"
```

### Pipeline Features

- **Type Checking**: Validates TypeScript before deployment
- **Environment Separation**: Different secrets for production vs staging
- **Build Validation**: Ensures SvelteKit build succeeds
- **Preview Deployments**: PRs get preview URLs for testing
- **Build Caching**: npm dependencies cached for faster builds

---

## Required GitHub Configuration

### GitHub Secrets

Navigate to **GitHub → Repository Settings → Secrets and Variables → Actions → Secrets**:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages edit permission | Cloudflare Dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare Dashboard → any domain → Overview (right sidebar) |
| `PUBLIC_SUPABASE_ANON_KEY` | Production Supabase anon key | Supabase Dashboard → Settings → API |

### GitHub Variables

Navigate to **GitHub → Repository Settings → Secrets and Variables → Actions → Variables**:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production Supabase URL |

### Optional Staging Secrets

For staging/preview environments:

| Secret Name | Description |
|-------------|-------------|
| `PUBLIC_SUPABASE_URL_STAGING` | Staging Supabase URL (if different) |
| `PUBLIC_SUPABASE_ANON_KEY_STAGING` | Staging Supabase anon key (if different) |

---

## Cloudflare Pages Configuration

### Project Settings

**Project Name**: `my-ms-event-tracker`

**Build Settings**:
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`
- Root directory: `/` (default)

**Environment Variables** (Set in Cloudflare Dashboard):
- `NODE_VERSION`: `20`
- Additional environment variables are passed via GitHub Actions

### Custom Domain Setup

If using a custom domain:

1. **Add Custom Domain** in Cloudflare Pages
2. **Configure DNS** in Cloudflare DNS
3. **SSL/TLS** is automatically handled by Cloudflare

---

## Environment Variables Management

### Production Environment

Production environment variables are set via GitHub Secrets and passed to the build process:

```yaml
env:
  PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
  PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
```

### Preview Deployments

Preview deployments (from PRs) can use staging environment variables if available:

```yaml
env:
  PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL_STAGING || secrets.PUBLIC_SUPABASE_URL }}
  PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY_STAGING || secrets.PUBLIC_SUPABASE_ANON_KEY }}
```

This allows testing against a staging Supabase instance if configured.

---

## Deployment Process

### Production Deployment

1. **Push to `main`** branch
2. **GitHub Actions** triggers automatically
3. **Build Process**:
   - Install dependencies
   - Run TypeScript checking
   - Build SvelteKit app
   - Deploy to Cloudflare Pages
4. **Live Site** updated at your Cloudflare Pages URL

### Preview Deployment

1. **Create Pull Request**
2. **GitHub Actions** triggers test workflow
3. **Build Validation**:
   - Install dependencies
   - Run TypeScript checking
   - Build SvelteKit app (without deployment)
4. **Preview URL** available in PR comments (if configured)

---

## Monitoring and Logs

### GitHub Actions Logs

View deployment status and logs:
1. Go to **GitHub → Repository → Actions**
2. Click on the workflow run
3. View logs for each step

### Cloudflare Pages Logs

View deployment history and logs:
1. Go to **Cloudflare Dashboard → Pages**
2. Select your project
3. View **Deployments** tab for history and logs

### Build Failures

Common build failure causes and solutions:

#### TypeScript Errors
```
Error: Type checking failed
```
**Solution**: Fix TypeScript errors locally and push again

#### Environment Variable Issues
```
Error: PUBLIC_SUPABASE_URL is not defined
```
**Solution**: Verify GitHub Secrets are configured correctly

#### Dependencies Issues
```
Error: Cannot find module 'xyz'
```
**Solution**: Ensure `package-lock.json` is committed and up-to-date

---

## Performance Optimization

### Build Optimization

The SvelteKit adapter for Cloudflare is configured for optimal performance:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      // Cloudflare Pages optimization
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

### Caching Strategy

Cloudflare automatically handles:
- **Static Asset Caching**: JS, CSS, images cached at edge
- **HTML Caching**: Configurable cache rules
- **API Route Caching**: Custom cache headers in API routes

---

## Security Configuration

### Content Security Policy

Configure CSP headers for security:

```javascript
// src/app.html or via Cloudflare Page Rules
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://your-project-ref.supabase.co;
  connect-src 'self' https://your-project-ref.supabase.co wss://your-project-ref.supabase.co;
  img-src 'self' data: https:;
">
```

### Environment Variable Security

- **Public Variables**: Prefixed with `PUBLIC_` (exposed to client)
- **Secret Variables**: Not prefixed (server-side only)
- **API Keys**: Always treat as secrets, never public

---

## Rollback Procedure

### Quick Rollback

1. **Find Previous Deployment** in Cloudflare Pages dashboard
2. **Promote Previous Version** to production
3. **Verify** the rollback was successful

### Git Rollback

1. **Find Last Good Commit**:
   ```bash
   git log --oneline
   ```

2. **Revert to Previous Version**:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```

3. **Automatic Redeployment** will occur

---

## Troubleshooting

### Common Issues

#### Deployment Fails with "Wrangler Error"
**Symptoms**: `Error: Failed to deploy to Cloudflare Pages`
**Solutions**:
- Verify Cloudflare API token has correct permissions
- Check that account ID is correct
- Ensure project name matches exactly

#### Build Succeeds but Site Shows Errors
**Symptoms**: Build passes but deployed site has runtime errors
**Solutions**:
- Check browser console for JavaScript errors
- Verify environment variables are set correctly in Cloudflare
- Test the built site locally with `npm run preview`

#### Authentication Issues on Deployed Site
**Symptoms**: Auth works locally but fails in production
**Solutions**:
- Verify Supabase URLs are correct
- Check OAuth redirect URLs in Supabase Dashboard
- Ensure anon key is for the correct Supabase project

### Getting Help

1. **Check GitHub Actions Logs** for build errors
2. **Check Cloudflare Pages Logs** for deployment issues
3. **Test Locally** with production environment variables
4. **Verify Configuration** matches between environments

---

## Related Documentation

- **[Environment Variables Guide](environment-variables.md)**: Detailed environment configuration
- **[Development Environment](../setup/development-environment.md)**: Local development setup
- **[OAuth Setup](../setup/oauth-setup.md)**: Authentication configuration
- **[Troubleshooting Guide](../troubleshooting.md)**: Common issues and solutions