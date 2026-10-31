# MS Symptom Tracker

A privacy-focused web application for tracking Multiple Sclerosis symptoms, mood, and interventions. Built for fast mobile logging during episodes with comprehensive tracking capabilities.

![Built with SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)
![Powered by Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Deployed on Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=cloudflare&logoColor=white)

## ⚡ Quick Start

```bash
# Clone and enter development environment
git clone https://github.com/johnstetter/my-ms-event-tracker.git
cd my-ms-event-tracker
devbox shell

# Install dependencies and start local development
npm install
supabase start
npm run dev
```

## 🎯 Key Features

- **⚡ 5-Second Logging**: Quick capture during muscle spasms, pain episodes, and mental-health moments (panic attacks, intrusive thoughts, anxiety)
- **🧩 Context-Aware Picker**: The intervention picker filters by the active event type — physical events show physical interventions, mental-health events show grounding/breathing/journaling, with universal items (rest, medications) shared across all
- **📱 Mobile-First**: Touch-optimized interface for phone use
- **📋 Event History**: Comprehensive browsing with filtering, search, and pagination
- **💊 Intervention Tracking**: Log treatments and medications with effectiveness tracking
- **⚙️ Admin Interface**: Full CRUD operations for custom event types, body locations, and interventions, with symmetric scope-tag editors on both sides
- **📊 Structured Logging**: Healthcare-appropriate observability with privacy controls
- **🔐 Privacy-Focused**: Your data stays in your control via personal Supabase instance
- **📊 Export Ready**: CSV/Excel export for medical providers
- **🏠 Home Assistant Ready**: Voice integration for hands-free logging *(planned)*

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SvelteKit     │────▶│ Cloudflare Pages│────▶│   Supabase      │
│   Frontend      │     │   (Hosting)     │     │  (Database)     │
│  - Quick Log UI │     │  - Auto Deploy │     │  - Auth (Google)│
│  - Event Mgmt   │     │  - Edge Cache   │     │  - RLS Policies │
│  - CSV Export   │     │  - Environment  │     │  - Real-time    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Tech Stack**: SvelteKit + TypeScript + Supabase + Cloudflare Pages + Devbox + Vitest + Structured Logging

## 📖 Documentation

### 👥 User Guides
- **[User Guide](docs/user-guide.md)** - How to use the application, feature walkthrough, and tips
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

### 🚀 Getting Started
- **[Development Setup](docs/setup/development-environment.md)** - Local environment with Devbox and Supabase
- **[OAuth Configuration](docs/setup/oauth-setup.md)** - Google authentication setup

### 🛠️ Development
- **[Developer Guide](docs/development/developer-guide.md)** - Architecture, workflows, and best practices
- **[Database Schema](docs/development/database-schema.md)** - Complete database design and structure
- **[API Design](docs/development/api-design.md)** - Home Assistant integration endpoints
- **[Logging System](docs/development/logging.md)** - Structured logging with healthcare privacy controls

### 🚀 Deployment
- **[Cloudflare Pages](docs/deployment/cloudflare-pages.md)** - Automated deployment with GitHub Actions

### 📋 Project Documentation
- **[Full Documentation Index](docs/README.md)** - Complete documentation overview

## 🏃‍♂️ Development Workflow

This project follows a **learning-focused development workflow** that emphasizes professional practices:

```bash
# 1. Always create GitHub issue first
gh issue create --title "Add pain tracking feature"

# 2. Create feature branch (never work on main)
git checkout -b feature/123-pain-tracking

# 3. Develop with local Supabase
supabase start
npm run dev

# 4. Test and commit
npm run check && npm run test:run && npm run build
git commit -m "feat: Add pain tracking interface"

# 5. Create PR and merge
git push && gh pr create
```

**Why this matters**: This project serves as both a health tracking tool and a **learning platform for professional development workflows**. The process discipline is as important as the technology.

## 📊 Current Status

### ✅ Completed (Phase 1)
- [x] Database schema with full health tracking support
- [x] Local development environment (Devbox + Supabase)
- [x] Authentication infrastructure (Google OAuth)
- [x] GitHub Actions deployment pipeline
- [x] Documentation reorganization
- [x] Comprehensive testing infrastructure

### ✅ Completed (Phase 2)
- [x] Quick symptom logging interface
- [x] Intervention tracking
- [x] Event resolution workflow
- [x] **Event History Page** - Comprehensive event browsing with filtering, pagination, search, and mobile-responsive design

### ✅ Completed (Phase 3)
- [x] **Admin Interface** - Complete CRUD operations for custom event types, body locations, and interventions
- [x] CSV/Excel export
- [x] **Structured Logging System** - Healthcare-appropriate observability with privacy controls

### ✅ Completed (Phase 4 — Foundation hardening)
- [x] **Server-side auth guards** - Cookie-based sessions via `@supabase/ssr` and route-level redirects
- [x] **Component type tightening** - Replaced `any[]` with generated Supabase types in event-display surface
- [x] **Critical-path test coverage** - Tests for `createQuickEvent`, offline queue, and CSV export
- [x] **Mental-health event types & context-aware picker** - Panic / anxiety / intrusive-thought logging with intervention scope tags
- [x] **Custom event-type slug uniqueness fix**

### 🚧 In Progress / Up Next
- [ ] Calendar view integration
- [ ] Pattern analysis and statistics

### 📋 Planned (Phase 5)
- [ ] Home Assistant voice integration
- [ ] Progressive Web App features
- [ ] Advanced export features with data visualization

## 🏥 Health Data Privacy

**Privacy-by-design architecture**:
- **Your Supabase instance**: Complete data control
- **No tracking**: No analytics transports ship by default; intentional analytics integration is a separate opt-in
- **Row Level Security**: Database-enforced data isolation
- **Local development**: Full offline capability
- **Export freedom**: Always own your data

## 🤝 Contributing

1. **Create an issue first** - No exceptions, even for obvious fixes
2. **Feature branches only** - Never commit directly to main
3. **Test locally** - Run `npm run test:run` before committing
4. **Follow commit conventions** - Structured messages for clean history
5. **Add tests for new features** - Maintain test coverage standards
6. **Update docs** - Keep documentation current

See [Developer Guide](docs/development/developer-guide.md) for detailed contributing guidelines.

## 🛠️ Available Commands

```bash
# Development
npm run dev                # Start development server
npm run check              # TypeScript type checking
npm run build              # Build for production

# Testing
npm test                   # Run tests in watch mode
npm run test:run           # Run all tests once
npm run test:coverage      # Generate test coverage report
npm run test:ui            # Open interactive test UI

# Environment management
supabase start             # Start local database stack
supabase stop              # Stop local environment
supabase db reset          # Fresh database with migrations

# Deployment
git push origin main       # Triggers auto-deployment
npm run deploy             # Manual Cloudflare deployment
```

## 🆘 Need Help?

- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues and solutions
- **[GitHub Issues](https://github.com/johnstetter/my-ms-event-tracker/issues)** - Bug reports and feature requests
- **[Documentation](docs/README.md)** - Comprehensive guides and references

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**⚠️ Medical Disclaimer**: This application is for personal health tracking only and is not intended as a substitute for professional medical care. Always consult healthcare providers for medical decisions.