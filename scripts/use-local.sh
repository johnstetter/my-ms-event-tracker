#!/bin/bash
# Switch to local environment configuration

echo "🔄 Switching to local environment..."
cp .env.local.example .env
echo ""
echo "✅ Now using LOCAL Supabase environment"
echo "   API: http://127.0.0.1:54321"
echo ""
echo "Make sure local Supabase is running: ./scripts/dev-local.sh"