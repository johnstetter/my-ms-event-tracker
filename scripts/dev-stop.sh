#!/bin/bash
# Stop local development environment

echo "🛑 Stopping local Supabase environment..."
supabase stop
echo ""
echo "✅ Local environment stopped."
echo "Your .env file still points to local - run ./scripts/use-prod.sh if you need production."