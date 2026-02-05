# Career Scout AI - The Ultimate AI Jobhunter

## Overview
AI-powered multi-user executive job search agent that helps find job opportunities based on the user's resume. The system functions like an executive headhunter with intelligent job analysis (prioritized by location: local 0-15mi highest, regional 15-50mi medium, remote lowest), personalized outreach scripts, career strategy planning, and daily action planning. Each user has a separate account with isolated data.

## Key Features
- **AI-Powered Job Search**: Discovers job opportunities matching the candidate's resume
- **Intelligent Matching**: Jobs scored 0-100 based on resume compatibility
- **Resume Upload & AI Analysis**: Upload resume for AI-powered analysis with strengths, weaknesses, suggestions, and overall score (0-100)
- **AI Resume Revisions**: Generate ATS-optimized, results-focused, executive-level, or concise versions
- **Script Generator**: AI-generated outreach scripts (email, LinkedIn, phone, follow-up)
- **AI Email Reply Generator**: Paste incoming emails and generate professional responses
- **Calendar & Interview Tracking**: Schedule interviews, follow-ups, deadlines with reminders
- **Reminder Notifications**: Bell icon in header shows upcoming events in next 24 hours
- **Mutual Connection Finder**: Identifies potential referral connections
- **Daily Action Planning**: AI-generated prioritized task lists
- **Application Tracker**: Track application status from applied to offered
- **Three Resume Versions**: Operations, Business Development, Sales/Remote
- **Strategy Command Center**: Job archetypes, interview prep, weekly execution plans
- **LinkedIn/Indeed Integration**: Quick search links, profile connections, manual import

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (no API key needed)
- **Routing**: wouter for frontend routing

## Project Structure
```
client/
  src/
    pages/
      dashboard.tsx      # Main overview with stats and priority actions
      job-search.tsx     # AI-powered job discovery
      applications.tsx   # Application status tracker
      calendar.tsx       # Calendar & interview tracking
      network.tsx        # Contacts and mutual connections
      scripts.tsx        # AI script generator + email reply generator
      actions.tsx        # Daily action items
      strategy.tsx       # Career strategy command center
      settings.tsx       # Profile, preferences, and integrations
    components/
      app-sidebar.tsx    # Navigation sidebar
      job-card.tsx       # Job opportunity card
      stats-card.tsx     # Statistics display card (clickable)
      action-item.tsx    # Daily action item component
      contact-card.tsx   # Network contact card with mailto/tel links
      script-card.tsx    # Generated script card with copy/expand
      theme-toggle.tsx   # Dark/light mode toggle
      reminder-indicator.tsx  # Header notification bell for upcoming events
server/
  routes.ts             # API endpoints (40+ routes)
  storage.ts            # Database operations
  db.ts                 # Database connection
shared/
  schema.ts             # Drizzle schema definitions (13 tables)
```

## Database Schema
- **jobs**: Job opportunities with match scores, contacts, resume versions
- **applications**: Application status tracking
- **contacts**: Professional network connections
- **dailyActions**: Prioritized daily tasks
- **scripts**: Generated outreach scripts
- **resumeProfile**: Candidate profile and preferences
- **searchHistory**: Job search history
- **jobArchetypes**: Target job categories with search strings
- **interviewStories**: STAR format interview preparation
- **outreachTemplates**: Reusable message templates
- **externalAccounts**: LinkedIn/Indeed connection info
- **weeklyPlans**: Weekly execution plans with goals
- **calendarEvents**: Interviews, follow-ups, deadlines with reminder times
- **users**: User accounts (legacy)

## API Endpoints
### Core CRUD
- `GET /api/stats` - Dashboard statistics
- `GET/POST/PATCH /api/jobs` - Job CRUD operations
- `GET/POST/PATCH /api/applications` - Application tracking
- `GET/POST/PATCH /api/contacts` - Contact management
- `GET/POST/PATCH /api/daily-actions` - Daily actions
- `GET/POST/PATCH /api/scripts` - Script management
- `GET/PATCH /api/profile` - Profile management
- `POST /api/profile/analyze-resume` - AI resume analysis
- `POST /api/profile/revise-resume` - AI resume revision

### AI-Powered
- `POST /api/jobs/search` - AI-powered job search
- `POST /api/contacts/find-mutuals` - AI mutual connection finder
- `POST /api/daily-actions/generate` - AI action plan generator
- `POST /api/scripts/generate` - AI script generator
- `POST /api/archetypes/generate` - AI archetype generator
- `POST /api/interview-stories/generate` - AI story generator
- `POST /api/weekly-plans/generate` - AI weekly plan generator
- `POST /api/emails/generate-reply` - AI email reply generator

### Calendar & Reminders
- `GET/POST/PATCH/DELETE /api/calendar-events` - Calendar event CRUD
- `POST /api/calendar-events/auto-assign` - Create event from job
- `GET /api/reminders` - Get upcoming reminders

### Strategy & Integration
- `GET/POST/PATCH /api/archetypes` - Job archetypes
- `GET/POST/PATCH /api/interview-stories` - Interview stories
- `GET/POST/PATCH /api/outreach-templates` - Outreach templates
- `GET/POST/PATCH /api/external-accounts` - LinkedIn/Indeed accounts
- `GET/POST/PATCH /api/weekly-plans` - Weekly execution plans

## Job Archetype Strategy
1. **Enterprise Account Executive**: High-value B2B sales, $120k-200k OTE
2. **Business Development Director**: Strategic partnerships, $100k-150k
3. **Regional Sales Manager**: Team leadership, $90k-140k
4. **Operations Manager**: Logistics/fulfillment, $80k-120k
5. **Channel Sales Manager**: Partner/vendor relations, $90k-130k
6. **Territory Sales Rep**: Field sales, $70k-110k OTE
7. **E-commerce Manager**: Digital marketplace, $75k-110k

## Resume Versions Strategy
1. **Operations Resume**: Best for Amazon, HMT, logistics/operations roles
2. **Business Development Resume**: Best for Five-S, Sulzer, B2B sales roles
3. **Sales/Remote Resume**: Best for INDYME, Insight Global, remote territory roles

## User Profile
- Name: Gerald (Ned) Pearson
- Location: Baton Rouge, LA
- Target Roles: Operations Manager, Business Development Manager, Territory Sales Manager
- Key Strengths: Top 1% national sales performer, 20+ years B2B sales, P&L management

## Development
- Run `npm run dev` to start the development server
- Run `npm run db:push` to sync database schema
- The app runs on port 5000
