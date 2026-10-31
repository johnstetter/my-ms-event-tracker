# OAuth Setup Guide

This guide provides comprehensive step-by-step instructions for setting up Google OAuth authentication through Supabase. This configuration is required to enable user authentication in the MS Symptom Tracker application.

## Prerequisites

Before starting, ensure you have:
- A Google Cloud Console account
- Access to your Supabase Dashboard
- The MS Symptom Tracker application code deployed or ready for local testing

---

## Part 1: Google Cloud Console Setup

### Step 1: Access Google Cloud Console

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. If this is your first time, you may need to accept the Terms of Service

### Step 2: Create or Select a Project

#### Option A: Create a New Project
1. Click on the **project dropdown** at the top of the page (next to "Google Cloud")
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: `MS Symptom Tracker` (or your preferred name)
   - **Organization**: Select your organization or leave as "No organization"
4. Click **"Create"**
5. Wait for project creation (takes 1-2 minutes)
6. Select the new project from the dropdown

#### Option B: Use Existing Project
1. Click on the **project dropdown**
2. Select an existing project where you want to configure OAuth

### Step 3: Access Google Auth Platform

1. In the left sidebar, navigate to **"Google Auth Platform"**
2. You'll see the **"OAuth Overview"** page
3. This is your main dashboard for managing OAuth clients and consent screens

*Note: Google Cloud Console now provides a streamlined OAuth setup through the Google Auth Platform section, replacing the older APIs & Services workflow. If you don't see "Google Auth Platform" in your sidebar, look for "APIs & Services" and follow the legacy path, though most users will see the new interface.*

### Step 4: Configure OAuth Consent Screen

1. In the **Google Auth Platform** section, click on **"Branding"** in the left navigation
2. Choose **"External"** user type (unless you have Google Workspace)
3. Click **"Create"**

#### Fill in App Information
1. **App name**: `MS Symptom Tracker`
2. **User support email**: Your email address
3. **App logo**: (Optional) Upload a logo if you have one
4. **App domain section**:
   - **Application home page**: Leave blank for now
   - **Application privacy policy link**: Leave blank for now
   - **Application terms of service link**: Leave blank for now
5. **Authorized domains**:
   - Add `supabase.co` (for Supabase redirects)
   - Add your production domain (e.g., `my-ms-event-tracker.pages.dev`)
   - *Note: Use your specific Cloudflare Pages subdomain, not the generic `pages.dev`*
6. **Developer contact information**: Your email address
7. Click **"Save and Continue"**

#### Configure Scopes
1. Click **"Add or Remove Scopes"**
2. Select these scopes:
   - `../auth/userinfo.email` - View your email address
   - `../auth/userinfo.profile` - See your personal info
   - `openid` - Associate you with your personal info
3. Click **"Update"**
4. Click **"Save and Continue"**

#### Test Users (Development Phase)
1. Click **"Add Users"**
2. Add your email address (and any other test users)
3. Click **"Save and Continue"**

*Note: Apps in "Testing" status can only be used by test users. You'll need to publish the app later for general use.*

### Step 5: Create OAuth Credentials

1. Return to the **"OAuth Overview"** page in **Google Auth Platform**
2. Click the **"Create OAuth Client"** button
3. Select **"Web application"** as the application type

#### Configure OAuth Client
1. **Application type**: Select **"Web application"**
2. **Name**: `MS Symptom Tracker Web Client`
3. **Authorized JavaScript origins**:
   - Add `http://localhost:5173` (for local SvelteKit development)
   - Add `http://127.0.0.1:5173` (alternative local address)
   - Add your production domain (e.g., `https://my-ms-event-tracker.pages.dev`)

4. **Authorized redirect URIs** (CRITICAL - must be exact):
   - **Local Development**: `http://127.0.0.1:54321/auth/v1/callback`
   - **Production**: `https://your-project-ref.supabase.co/auth/v1/callback`

   *Replace `your-project-ref` with your actual Supabase project reference*

5. Click **"Create"**

### Step 6: Copy Credentials

1. A dialog will appear with your **Client ID** and **Client Secret**
2. **IMPORTANT**: Copy both values and save them securely
   - **Client ID**: Looks like `123456789-abcdefg.apps.googleusercontent.com`
   - **Client Secret**: Looks like `GOCSPX-abcdefghijklmnop`

3. You can also download the JSON file for backup
4. Click **"OK"**

**⚠️ Security Note**: Treat the Client Secret as a password. Never commit it to version control or share it publicly.

---

## Part 2: Supabase Dashboard Configuration

### Step 1: Access Supabase Dashboard

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **MS Symptom Tracker** project

### Step 2: Navigate to Authentication

1. In the left sidebar, click **"Authentication"**
2. Click on the **"Providers"** tab

### Step 3: Configure Google Provider

1. Find **"Google"** in the providers list
2. Toggle the **"Enable"** switch to ON
3. Fill in the configuration:

#### Client ID and Secret
- **Client ID**: Paste the Client ID from Google Cloud Console
- **Client Secret**: Paste the Client Secret from Google Cloud Console

#### Redirect URL Configuration
The **Redirect URL** should be automatically populated as:
```
https://your-project-ref.supabase.co/auth/v1/callback
```

**Verify this matches** the redirect URI you added in Google Cloud Console.

### Step 4: Configure Additional Settings

#### Site URL
1. Scroll down to **"Site URL"**
2. Set this to your application's URL:
   - **Development**: `http://localhost:5173`
   - **Production**: `https://my-ms-event-tracker.pages.dev` (your specific Cloudflare Pages URL)

#### Redirect URLs
1. In the **"Redirect URLs"** section, add:
   - `http://localhost:5173` (for local development)
   - `http://127.0.0.1:5173` (alternative local)
   - Your production URL

### Step 5: Save Configuration

1. Click **"Save"** at the bottom of the page
2. Wait for the confirmation message

---

## Part 3: Environment Configuration

### Update Environment Variables

Update your environment variables with the Supabase URLs:

#### Local Development (`.env`)
```bash
# Your existing Supabase config
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# OAuth is configured on the Supabase side
NODE_ENV=development
```

#### Production (GitHub Secrets)
Ensure these are configured in your GitHub repository:
- `PUBLIC_SUPABASE_URL`: Your production Supabase URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your production anonymous key

*No Google credentials need to be stored in your application - they're managed by Supabase.*

---

## Part 4: Testing the Authentication Flow

### Local Testing

1. **Start your local development environment**:
   ```bash
   npm run dev
   ```

2. **Navigate to your app** (usually `http://localhost:5173`)

3. **Test the authentication flow**:
   - Click the "Sign in with Google" button
   - You should be redirected to Google's OAuth screen
   - Sign in with your Google account (must be a test user if app is in testing mode)
   - You should be redirected back to your app and logged in

### Production Testing

1. **Deploy your application** to production
2. **Navigate to your production URL**
3. **Test the same authentication flow**

### Troubleshooting Authentication Issues

#### Common Error: "redirect_uri_mismatch"
**Cause**: The redirect URI doesn't exactly match what's configured in Google Cloud Console

**Solution**:
1. Check the error message for the actual redirect URI being used
2. Ensure it exactly matches what's in Google Cloud Console
3. Common mismatches:
   - `http` vs `https`
   - `localhost` vs `127.0.0.1`
   - Missing `/auth/v1/callback` path
   - Wrong Supabase project reference

#### Common Error: "access_denied"
**Cause**: User isn't added as a test user, or app needs to be published

**Solutions**:
1. Add the user's email to test users in Google Cloud Console
2. Or publish your app (see Publishing section below)

#### Common Error: "invalid_client"
**Cause**: Client ID or Client Secret is incorrect

**Solution**:
1. Double-check credentials in Supabase Dashboard
2. Regenerate credentials in Google Cloud Console if needed

---

## Part 5: Publishing Your App (Optional)

If you want users other than test users to sign in, you need to publish your OAuth app.

### Step 1: Prepare for Verification

1. **Add required policies**:
   - Create a privacy policy (can be simple for personal apps)
   - Create terms of service (optional but recommended)

2. **Update OAuth consent screen** (in the **"Branding"** section):
   - Add privacy policy URL
   - Add terms of service URL (optional)
   - Add app home page URL

### Step 2: Submit for Verification

1. In Google Cloud Console, go to **"Google Auth Platform" → "Branding"**
2. Click **"Publish App"**
3. Click **"Confirm"**

**Note**: For apps that only request basic profile information (email, profile), verification may not be required. Google will show a warning screen but allow users to continue.

### Step 3: Handle Verification Process

- **Low-risk apps**: May be automatically approved
- **Higher-risk apps**: Google may request additional information
- **Timeline**: Can take several days to weeks

---

## Part 6: Security Best Practices

### Google Cloud Console Security

1. **Limit OAuth scopes**: Only request the minimum scopes needed
2. **Restrict domains**: Add your domains to "Authorized domains"
3. **Monitor usage**: Check the APIs & Services dashboard regularly
4. **Rotate credentials**: Regenerate Client Secret periodically

### Supabase Security

1. **Row Level Security**: Ensure RLS is enabled on all tables
2. **Monitor auth logs**: Check authentication logs in Supabase Dashboard
3. **Review users**: Regularly review user accounts for suspicious activity

### Application Security

1. **HTTPS only**: Always use HTTPS in production
2. **Secure redirects**: Validate redirect URLs
3. **Session management**: Implement proper session timeout
4. **Error handling**: Don't expose sensitive information in error messages

---

## Part 7: Advanced Configuration

### Custom Scopes (Optional)

If you need additional Google services access:

1. **In Google Cloud Console**:
   - Go to "Google Auth Platform" → "Branding" → "Scopes"
   - Add additional scopes as needed
   - Example: Google Calendar access for appointment scheduling

2. **In your application**:
   ```javascript
   // Request additional scopes
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       scopes: 'email profile calendar.readonly'
     }
   });
   ```

### Multiple Environments

For staging environments:

1. **Create separate OAuth client** in Google Cloud Console
2. **Configure different redirect URIs** for staging
3. **Use separate Supabase project** for staging (recommended)

### Domain Verification

For custom domains:

1. **Verify domain ownership** in Google Cloud Console
2. **Add domain to authorized domains**
3. **Update redirect URIs** to use custom domain

---

## Troubleshooting Guide

### Issue: "App not verified" warning
**Symptoms**: Users see a warning screen about unverified app
**Solution**: This is normal for apps in testing. Users can click "Advanced" → "Go to [App Name] (unsafe)" to continue, or publish your app for verification.

### Issue: Authentication works locally but fails in production
**Symptoms**: Auth succeeds on localhost but fails on deployed site
**Solutions**:
1. Check production redirect URI in Google Cloud Console
2. Verify Supabase Site URL is set to production URL
3. Ensure environment variables are correctly configured

### Issue: "OAuth client not found"
**Symptoms**: Error during authentication process
**Solutions**:
1. Verify Client ID is correctly entered in Supabase
2. Check that OAuth client exists in Google Cloud Console
3. Ensure you're using the correct Google Cloud project

### Issue: Users can't sign in after initial setup
**Symptoms**: Some users can sign in, others cannot
**Solutions**:
1. Check if failing users are added as test users
2. Verify OAuth consent screen configuration
3. Consider publishing the app for general use

### Issue: "Invalid redirect URI" in production
**Symptoms**: Works in development but fails when deployed
**Solutions**:
1. Add your production domain to authorized JavaScript origins
2. Verify the exact redirect URI format: `https://your-project.supabase.co/auth/v1/callback`
3. Check for typos in Supabase project reference ID

---

## Maintenance

### Regular Tasks

**Monthly**:
- Review OAuth usage in Google Cloud Console
- Check for any security alerts
- Monitor authentication success rates in Supabase

**Quarterly**:
- Review and update OAuth scopes if needed
- Audit test user list
- Check for Google API changes or updates

**Annually**:
- Consider rotating Client Secret
- Review and update privacy policy
- Evaluate need for additional OAuth providers

### Monitoring

**Key Metrics to Watch**:
- Authentication success rate
- Failed login attempts
- New user registrations
- OAuth error frequency

**Tools**:
- Supabase Dashboard Analytics
- Google Cloud Console API metrics
- Application logs and monitoring

---

## Related Documentation

- **[Development Environment](development-environment.md)**: Local development setup
- **[Environment Variables](../deployment/environment-variables.md)**: Environment configuration
- **[Troubleshooting](../troubleshooting.md)**: Common issues and solutions
- **[Developer Guide](../development/developer-guide.md)**: Authentication architecture

---

## External Resources

- [Google Cloud OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/rfc6819)
- [Google OAuth Verification Process](https://support.google.com/cloud/answer/9110914)

---

## Support

If you encounter issues not covered in this guide:

1. **Check logs**: Browser console, Supabase Dashboard, Google Cloud Console
2. **Review configurations**: Double-check all settings match this guide
3. **Test incrementally**: Start with local development, then move to production
4. **Create GitHub issue**: If problems persist, create an issue with detailed error information

---

*Last updated: February 2026*
*This guide reflects current Google Cloud Console and Supabase Dashboard interfaces*