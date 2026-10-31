#!/bin/bash
# Switch to production environment configuration

echo "🔄 Switching to production environment..."
cp .env.example .env
echo ""
echo "⚠️  Now using PRODUCTION Supabase environment"
echo "   API: https://your-project-ref.supabase.co"
echo ""
echo "🚨 CAUTION: You are now connected to the live production database!"