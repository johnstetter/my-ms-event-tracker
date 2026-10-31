#!/bin/bash
# Start local development environment

echo "🚀 Starting local development environment..."
echo ""

echo "1. Starting Supabase local stack..."
supabase start

echo ""
echo "2. Switching to local environment config..."
cp .env.local.example .env

echo ""
echo "✅ Local development environment ready!"
echo ""
echo "📊 Supabase Studio: http://127.0.0.1:54323"
echo "🔗 Local API: http://127.0.0.1:54321"
echo "📧 Mailpit (email testing): http://127.0.0.1:54324"
echo ""
echo "Your app is now configured to use the local database."
echo "Start your dev server with: npm run dev"