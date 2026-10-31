# Troubleshooting Guide

This guide covers common issues and solutions for development, deployment, and production use of the MS Symptom Tracker application.

## Development Environment Issues

### Local Supabase Won't Start

**Symptoms**:
- `supabase start` fails or hangs
- Database connection errors in development
- Docker containers not starting

**Solutions**:

1. **Check Docker is Running**:
   ```bash
   docker ps
   # Should show running containers
   ```

2. **Stop All Containers and Restart**:
   ```bash
   docker stop $(docker ps -aq)
   supabase stop
   supabase start
   ```

3. **Reset Local Environment**:
   ```bash
   supabase db reset
   # This will recreate the local database with all migrations
   ```

4. **Check Docker Resources**:
   - Ensure Docker has sufficient memory allocated (4GB+ recommended)
   - Close other resource-intensive applications

5. **Port Conflicts**:
   ```bash
   lsof -i :54421  # Check if API port is in use
   lsof -i :54423  # Check Studio port
   ```

### Migration Issues

**Symptoms**:
- Migration conflicts
- Schema out of sync
- Local database doesn't match production

**Solutions**:

1. **Reset Local Database**:
   ```bash
   supabase db reset
   # Applies all migrations from scratch
   ```

2. **Check Migration Status**:
   ```bash
   supabase migration list
   # Shows applied vs pending migrations
   ```

3. **Create New Migration**:
   ```bash
   supabase migration new fix_schema_issue
   # Creates new migration file to fix conflicts
   ```

4. **Manual Schema Sync**:
   ```bash
   supabase db diff --use-migra
   # Shows differences between local and remote
   ```

### Environment Variables Not Working

**Symptoms**:
- Build fails with "PUBLIC_SUPABASE_URL is not defined"
- Authentication not working
- App connects to wrong Supabase instance

**Solutions**:

1. **Verify `.env` File Exists**:
   ```bash
   cat .env
   # Should show Supabase URL and anon key
   ```

2. **Check File Contents**:
   ```bash
   # Local development should have:
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54421
   PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

   # Production should have:
   PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Restart Development Server**:
   ```bash
   npm run dev
   # Environment variables are loaded on startup
   ```

4. **Use Helper Scripts**:
   ```bash
   # Switch to local development
   ./scripts/use-local.sh

   # Switch to production
   ./scripts/use-production.sh
   ```

---

## Authentication Issues

### Google OAuth Setup Problems

**Symptoms**:
- "OAuth error" when signing in
- Redirect URI mismatch errors
- Authentication works locally but not in production

**Solutions**:

1. **Verify Google Cloud Console Configuration**:
   - Authorized redirect URIs must include:
     - `https://your-project-ref.supabase.co/auth/v1/callback` (production)
     - `http://127.0.0.1:54421/auth/v1/callback` (local dev)

2. **Check Supabase Dashboard Settings**:
   - Go to **Authentication → Providers**
   - Ensure Google provider is enabled
   - Verify Client ID and Secret are correct
   - Check that site URL is set correctly

3. **Clear Browser Data**:
   ```bash
   # Clear cookies and localStorage
   # Or use incognito mode for testing
   ```

4. **Verify Environment Variables**:
   ```javascript
   // Check in browser console:
   console.log(import.meta.env.PUBLIC_SUPABASE_URL);
   console.log(import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
   ```

### Session Persistence Issues

**Symptoms**:
- User logged out after page refresh
- Auth state not maintained across browser sessions
- Login works but immediately logs out

**Solutions**:

1. **Check Auth Store Initialization**:
   ```javascript
   // Ensure auth stores are properly imported in layout
   import '$lib/stores/auth.js';
   ```

2. **Verify Local Storage**:
   - Check browser dev tools → Application → Local Storage
   - Should see `sb-<project-ref>-auth-token`

3. **Check for Storage Conflicts**:
   ```javascript
   // Clear Supabase storage if corrupted
   localStorage.removeItem('sb-your-project-ref-auth-token');
   ```

---

## Build and Deployment Issues

### TypeScript Compilation Errors

**Symptoms**:
- `npm run check` fails
- Build fails with type errors
- GitHub Actions deployment fails

**Solutions**:

1. **Run Type Checking Locally**:
   ```bash
   npm run check
   # Fix any reported type errors
   ```

2. **Common Type Issues**:
   ```typescript
   // Make sure Supabase types are generated
   supabase gen types typescript --local > src/lib/types.ts

   // Import types properly
   import type { Database } from '$lib/types';
   ```

3. **Clear TypeScript Cache**:
   ```bash
   rm -rf .svelte-kit
   npm run check
   ```

### Build Output Issues

**Symptoms**:
- Build succeeds but site doesn't load
- Static assets not found
- Cloudflare Pages build fails

**Solutions**:

1. **Check Build Output Directory**:
   ```bash
   npm run build
   ls -la .svelte-kit/cloudflare/
   # Should contain built files
   ```

2. **Verify Adapter Configuration**:
   ```javascript
   // svelte.config.js
   import adapter from '@sveltejs/adapter-cloudflare';

   export default {
     kit: {
       adapter: adapter()
     }
   };
   ```

3. **Test Production Build Locally**:
   ```bash
   npm run build
   npm run preview
   # Test at http://localhost:4173
   ```

### GitHub Actions Failures

**Symptoms**:
- Deployment workflow fails
- Missing secrets errors
- Permission denied errors

**Solutions**:

1. **Check GitHub Secrets**:
   - Go to **Repository Settings → Secrets and Variables → Actions**
   - Verify all required secrets are set:
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`
     - `PUBLIC_SUPABASE_ANON_KEY`

2. **Check GitHub Variables**:
   - Verify `PUBLIC_SUPABASE_URL` is set as a variable (not secret)

3. **Verify Cloudflare Token Permissions**:
   - Token must have **Cloudflare Pages Edit** permission
   - Token must be for the correct Cloudflare account

4. **Check Workflow File**:
   ```yaml
   # Ensure .github/workflows/deploy.yml has correct syntax
   # Check indentation and required fields
   ```

---

## Runtime Issues

### API Connection Problems

**Symptoms**:
- Can't save events
- Database operations fail
- "Network error" messages

**Solutions**:

1. **Check Network Tab in Browser Dev Tools**:
   - Look for failed API requests
   - Check response status codes and messages

2. **Verify Supabase Connection**:
   ```javascript
   // Test in browser console
   const { data, error } = await supabase.from('event_types').select('*');
   console.log(data, error);
   ```

3. **Check RLS Policies**:
   - Ensure user is authenticated
   - Verify policies allow the operation
   - Test in Supabase Studio with same user ID

4. **Database Connection**:
   ```bash
   # Test local connection
   curl http://127.0.0.1:54421/rest/v1/event_types \
     -H "apikey: your_anon_key" \
     -H "Authorization: Bearer your_anon_key"
   ```

### Performance Issues

**Symptoms**:
- Slow page loads
- Database queries taking too long
- High memory usage

**Solutions**:

1. **Check Database Indexes**:
   ```sql
   -- Verify indexes exist
   \di events*
   ```

2. **Analyze Query Performance**:
   - Use Supabase Studio Query Performance tab
   - Look for slow queries and missing indexes

3. **Check Bundle Size**:
   ```bash
   npm run build -- --analyze
   # Look for large dependencies
   ```

4. **Monitor Network Requests**:
   - Check for unnecessary API calls
   - Implement proper data caching

---

## Data Issues

### Missing or Corrupted Data

**Symptoms**:
- Event types, locations, or interventions not showing
- Database appears empty
- Seed data missing

**Solutions**:

1. **Check Authentication**:
   ```javascript
   // Verify user is logged in
   const { data: { user } } = await supabase.auth.getUser();
   console.log(user);
   ```

2. **Verify RLS Policies**:
   - Check if policies are too restrictive
   - Test queries in Supabase Studio as authenticated user

3. **Re-run Seed Data**:
   ```bash
   # For local development
   supabase db reset

   # For production (careful!)
   # Re-run seed INSERT statements in Supabase Studio
   ```

### Intervention picker shows the wrong items for an event

**Symptoms**:
- Logging a panic attack and the picker shows Heat Pack / Stretching
- Logging a muscle spasm and the picker shows Grounding Exercise / Deep Breathing
- A user-created event type's picker is missing physical interventions you'd expect

**Cause**: scope tags in `intervention_event_types`. The picker filters based on the active event type using universal-by-default semantics — an intervention with no scope tags appears everywhere; with scope tags it appears only on those event types.

**Solutions**:

1. **Inspect scope tags directly**:
   ```bash
   docker exec -it supabase_db_my-ms-event-tracker \
     psql -U postgres -d postgres -c \
     "SELECT i.name, e.slug FROM intervention_event_types iet
        JOIN interventions i ON iet.intervention_id = i.id
        JOIN event_types e ON iet.event_type_id = e.id
        ORDER BY i.name, e.slug;"
   ```

2. **For your custom event types**: visit `/admin/event-types/[id]` and use the "Intervention Scope" multi-select to add or remove your custom interventions. (System interventions like Heat Pack and Baclofen are seed-frozen — see point 3.)

3. **For system interventions**: their scope is set at install time by the seed migration. Per-user overrides are not supported in the current release. Workaround: create a custom intervention mirroring the system one and scope it however you like.

4. **Reset to the seeded baseline locally**:
   ```bash
   supabase db reset
   # Re-applies all migrations including the mental-health seed
   ```

4. **Check Data in Supabase Studio**:
   - Browse tables directly
   - Verify data exists and is accessible

### Import/Export Issues

**Symptoms**:
- CSV export fails
- Data export is incomplete
- Import validation errors

**Solutions**:

1. **Check User Permissions**:
   ```sql
   -- Test query as user
   SELECT * FROM events WHERE user_id = auth.uid();
   ```

2. **Verify Date Ranges**:
   ```javascript
   // Check date filter logic
   const startDate = new Date('2024-01-01').toISOString();
   const endDate = new Date('2024-12-31').toISOString();
   ```

3. **Test Query in Supabase Studio**:
   - Run the export query manually
   - Check for syntax or logic errors

---

## Browser-Specific Issues

### Safari Issues

**Symptoms**:
- Authentication doesn't work in Safari
- Local storage issues
- CORS errors

**Solutions**:

1. **Check Safari Settings**:
   - Disable "Prevent cross-site tracking"
   - Allow cookies from Supabase domain

2. **Test in Private Mode**:
   - Rules out extension conflicts
   - Fresh browser state

### Mobile Browser Issues

**Symptoms**:
- Touch targets too small
- Layout broken on mobile
- Performance issues

**Solutions**:

1. **Check Viewport Meta Tag**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

2. **Test Touch Targets**:
   - Ensure buttons are at least 44px
   - Check for proper spacing

3. **Use Browser Dev Tools**:
   - Test responsive design
   - Check console for mobile-specific errors

---

## Getting Help

### Diagnostic Information

When asking for help, include:

1. **Environment Details**:
   ```bash
   node --version
   npm --version
   git status
   ```

2. **Error Messages**:
   - Copy full error message
   - Include stack traces
   - Browser console errors

3. **Steps to Reproduce**:
   - Exact steps that cause the issue
   - Expected vs actual behavior

4. **Configuration**:
   - Relevant parts of configuration files
   - Environment variable setup (without sensitive values)

### Resources

- **[GitHub Issues](https://github.com/johnstetter/my-ms-event-tracker/issues)**: Report bugs and feature requests
- **[Supabase Documentation](https://supabase.com/docs)**: Database and auth help
- **[SvelteKit Documentation](https://kit.svelte.dev/)**: Frontend framework help
- **[Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)**: Deployment help

### Support Channels

1. **GitHub Issues**: Primary support channel
2. **Documentation**: Check related docs first
3. **Community Forums**: Supabase and SvelteKit communities
4. **Stack Overflow**: Tag questions with `sveltekit`, `supabase`, `cloudflare-pages`

---

## Prevention Strategies

### Development Best Practices

1. **Always Test Locally** before pushing
2. **Use Feature Branches** for all changes
3. **Run Type Checking** before commits
4. **Keep Dependencies Updated** regularly

### Monitoring

1. **Set Up Error Tracking** (Sentry, LogRocket, etc.)
2. **Monitor Performance** (Core Web Vitals)
3. **Watch GitHub Actions** for build failures
4. **Check Supabase Logs** regularly

### Backup Strategy

1. **Database Backups**: Automatic via Supabase
2. **Code Backups**: Git repository
3. **Environment Config**: Document all settings
4. **Recovery Plan**: Test restore procedures

---

## Related Documentation

- **[Development Environment](setup/development-environment.md)**: Local setup guide
- **[OAuth Setup](setup/oauth-setup.md)**: Authentication configuration
- **[Deployment Guide](deployment/cloudflare-pages.md)**: Production deployment
- **[Database Schema](development/database-schema.md)**: Database structure and queries