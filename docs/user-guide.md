# User Guide: MS Symptom Tracker

## Overview

MS Symptom Tracker is designed for **fast logging during MS episodes** with comprehensive tracking capabilities. The interface prioritizes speed when you need it most, with detailed management when you have time.

## 🚀 Quick Start

### First Time Setup
1. **Sign in** with your Google account
2. **Bookmark the app** for quick mobile access
3. **Test quick logging** - the 5-second rule!

### Daily Use
- **During episodes**: Use Quick Log for immediate capture
- **When comfortable**: Review history, add interventions, resolve events

---

## 📱 Core Features

### 🏃‍♂️ Quick Log (5-Second Logging)

**Purpose**: Capture symptoms or mental-health moments immediately when they occur

**When to use**: During muscle spasms, pain episodes, panic attacks, intrusive thoughts, anxiety waves, or any MS symptom

**How to use**:
1. **Tap** the "Quick Log" button on homepage
2. **Select** event type — physical (Muscle Spasm, Pain Episode, Bowel Movement) or mental-health (Panic Attack, Anxiety, Intrusive Thought)
3. **Set** severity (1-10) if applicable
4. **Choose** body location if the event type uses one (mental-health types skip this)
5. **Tap** "Log Event" - Done!

**Tips**:
- ⏱️ **Speed matters** - don't worry about details during episodes
- 📝 **Add notes later** - focus on core info first. Notes are a great place to capture context like "thinking about X while doing dishes" for intrusive thoughts.
- 📱 **Use mobile** - designed for one-handed operation

### 📊 Dashboard

**Purpose**: Overview of recent activity and quick access to features

**What you'll see**:
- **Recent Events** (last 3 logged)
- **Quick Log** button for immediate access
- **View All Events** link to full history

**Navigation**:
- 📱 **Mobile**: Tap any event card to view details
- 🖥️ **Desktop**: Click events or use "View All Events" link

### 📋 Event History

**Purpose**: Browse, filter, and manage all your health events

**Features**:
- **Search** events by notes (e.g., "headache", "severe")
- **Filter** by event types (migraines, spasms, etc.)
- **Date ranges** with presets (last week, month, 3 months)
- **Sort** by date or severity (newest/oldest first)
- **Pagination** for large histories (25/50/100 events per page)

**How to access**:
- From dashboard: **"View All Events →"** link
- Or visit: `/history` page directly

**Filtering Tips**:
- 📅 **Date presets** for common ranges (last week, month)
- 🔍 **Search** works on event notes and descriptions
- 🏷️ **Event types** help narrow down specific symptoms
- 🔄 **URL sharing** - bookmark filtered views

### 🔍 Event Details

**Purpose**: View complete information about a specific health event

**What you'll see**:
- **Event information** (type, severity, time, location)
- **Notes** and custom attributes
- **Intervention history** (medications, treatments applied)
- **Resolution status** (ongoing vs. resolved)

**Available actions**:
- **Add interventions** (medications, treatments)
- **Resolve event** (mark as ended)
- **Edit notes** (add context later)

### 💊 Intervention Tracking

**Purpose**: Track what treatments or coping strategies you applied and when

**Common interventions**:
- Medications (Baclofen, Cannabis variants, PRN anti-anxiety)
- Physical (Heat Pack, Stretching, Massage, Position Change, Theracane, Tennis Ball, Rest)
- Mental health (Grounding Exercise, Deep Breathing, Call Therapist, Journaling)

**Context-aware picker**:
The intervention picker filters automatically based on which event type you're logging against:
- 🌀 Mental-health event (panic, anxiety, intrusive thought) → mental-health interventions + universal items (Rest, medications)
- 🔥 Physical event (muscle spasm, pain, bowel movement) → physical interventions + universal items
- Items left untagged in admin appear in **every** picker as "universal"

**How to add**:
1. **Open event** you want to track intervention for
2. **Click** "Add Intervention" button
3. **Select** intervention type from the filtered picker
4. **Add notes** if needed (dosage, duration, what helped)
5. **Save** - automatically timestamps the intervention

**Why track interventions**:
- 📈 **Effectiveness** - see what works for different symptoms
- 💊 **Medication tracking** - dosage timing and frequency
- 🧠 **Mental-health follow-up** - share duration and frequency with your therapist
- 🩺 **Medical records** - export data for healthcare providers

---

## 📱 Mobile Usage Tips

### Touch-Friendly Design
- **Large tap targets** for easy access during episodes
- **Minimal scrolling** required for quick logging
- **Portrait orientation** optimized

### Quick Access
- **Bookmark** the app on your phone's home screen
- **Use PWA** (Progressive Web App) features when available
- **One-handed operation** designed for accessibility during spasms

### Offline Considerations
- **Internet required** for logging (data stored in cloud)
- **Quick sync** when connection returns
- **Lightweight** - loads fast on mobile data

---

## 🖥️ Desktop Usage

### Enhanced Features
- **Broader view** of event history and filtering
- **Keyboard shortcuts** for faster navigation
- **Multiple filters** visible simultaneously

### Filter Management
- **Desktop layout** shows all filters in horizontal row
- **Live URL updates** for bookmarking specific views
- **Bulk operations** easier with keyboard + mouse

---

## 📊 Data Export

### For Medical Providers

**Purpose**: Share your health data with doctors, specialists

**How to export**:
1. **Go to Event History** page
2. **Apply filters** for desired date range or symptoms
3. **Click Export** button (when available)
4. **Choose format**: CSV for spreadsheets, PDF for printing

**What's included**:
- Event types, dates, severity ratings
- Body locations affected
- Intervention history with timestamps
- Notes and custom attributes
- Resolution status and duration

### Privacy & Control
- **Your data** stays in your personal Supabase instance
- **Export anytime** - no vendor lock-in
- **Delete anytime** - full control over your health data

---

## 🏥 Healthcare Integration

### Sharing with Providers

**Before appointments**:
1. **Export recent data** (last 3 months typical)
2. **Filter by relevant symptoms** for specific specialists
3. **Include intervention effectiveness** notes

**During appointments**:
- **Show trends** using filtered date ranges
- **Demonstrate patterns** with search functionality
- **Real-time access** to specific event details

### Data Accuracy
- **Timestamp precision** helps with medication timing
- **Severity scales** provide consistent measurement
- **Location mapping** assists with neurological assessment

---

## 🔧 Troubleshooting

### Common Issues

**Can't log in**:
- Verify Google account access
- Check internet connection
- Try clearing browser cache

**Quick log button not responsive**:
- Check internet connection
- Refresh the page
- Ensure browser is up to date

**Missing recent events**:
- Check if filters are applied
- Verify date range settings
- Confirm events were saved (check browser console)

**Mobile layout problems**:
- Rotate to portrait orientation
- Zoom browser to 100%
- Update browser to latest version

### Performance Tips
- **Regular browser updates** for best performance
- **Clear cache** if app feels slow
- **Stable internet** recommended for logging during episodes

---

## 🆘 Getting Help

### Self-Help Resources
1. **[Troubleshooting Guide](troubleshooting.md)** - Technical issues and solutions
2. **[Developer Guide](development/developer-guide.md)** - Technical documentation
3. **This User Guide** - Feature usage and tips

### Support
- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Check other guides for detailed setup

### Privacy & Data Questions
- **Your Supabase instance** = your data control
- **No analytics ship by default** — intentional analytics integration is opt-in (tracked in #119)
- **Row Level Security** protects your data in database
- **Server-side auth guard** keeps protected pages from rendering before sign-in

---

## 📈 Advanced Usage

### Power User Features

**URL Bookmarking**:
- Bookmark filtered history views
- Share specific date ranges or symptom filters
- Quick access to commonly needed views

**Search Optimization**:
- Use specific keywords in event notes for better search
- Include intervention names for finding effectiveness patterns
- Date-stamp important context in notes

**Pattern Recognition**:
- Use date range filters to identify triggers
- Compare intervention effectiveness across similar events
- Track severity patterns over time

**Admin Interface Customization**:
- Access the Admin Interface via the navigation menu
- **Custom Event Types**: Create event types specific to your MS experience
  - Configure severity tracking (1-10 scale) per event type
  - Enable body location tracking for events that affect specific areas
  - Add duration tracking for time-based events
  - **Intervention scope**: pick which of your custom interventions appear in the picker for this event type. Leave empty to keep them universal across all event types. (System interventions like Heat Pack and Baclofen are scoped at install and aren't editable per-user.)
- **Body Locations**: Organize locations by anatomical region
  - Create specific locations like "Left Optic Nerve" or "Right Arm Weakness"
  - Group by region (Head, Torso, Arms, Legs, Other) for easy navigation
- **Interventions**: Manage your treatment toolkit
  - Organize by category: Medication, Physical, Mental Health, Alternative, Lifestyle, Other
  - **Event-type scope**: pick which event types this intervention should appear in. Leave empty to make it universal — it shows in every picker.
  - Track effectiveness for different intervention types
  - Enable/disable interventions as your treatment plan changes
- **Symmetric scope-tag editing**: the same many-to-many relationship is editable from either side — if it's easier to start from the event type and pick interventions, do that; if it's easier to pick which event types a new intervention applies to, do it from the intervention page. Both views write the same join table.
- **Usage Tips**:
  - Start with a few custom items and expand based on your tracking needs
  - Use descriptive names that make sense to you and your healthcare providers
  - Deactivate rather than delete items to preserve historical data integrity

### Future Features
- **Home Assistant integration** for voice logging
- **Progressive Web App** features for offline access
- **Enhanced export** with charts and trend analysis

---

*This guide covers the mental-health & context-aware-picker release (April 2026).*

**⚠️ Medical Disclaimer**: This application is for personal health tracking only and is not intended as a substitute for professional medical care. Always consult healthcare providers for medical decisions.