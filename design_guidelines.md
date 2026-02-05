# Design Guidelines: Executive Job Search Agent

## Design Approach
**System Selected:** Productivity-focused design drawing from Linear, Notion, and modern job platforms (LinkedIn, Indeed)
**Rationale:** This is a utility-first application requiring clear information hierarchy, efficient workflows, and professional credibility. The design should communicate competence and organization.

## Typography
**Font Stack:**
- Primary: Inter or System UI (-apple-system, BlinkMacSystemFont, "Segoe UI")
- Monospace: JetBrains Mono for job IDs, dates, tracking numbers

**Hierarchy:**
- Page titles: text-3xl font-semibold
- Section headers: text-xl font-medium
- Card titles: text-lg font-medium
- Body text: text-base
- Metadata/labels: text-sm text-gray-600

## Layout System
**Spacing Units:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6
- Section margins: mb-8
- Card spacing: space-y-4
- Grid gaps: gap-6

**Container Strategy:**
- Main content: max-w-7xl mx-auto px-6
- Sidebar (if used): w-64 fixed
- Forms: max-w-2xl

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with logo/title left
- Primary actions (New Search, View Jobs, Settings) center/right
- User profile indicator far right
- Height: h-16, subtle border-b

**Sidebar Navigation (Optional):**
- Dashboard, Active Jobs, Scripts, Resume Manager, Network, Settings
- Icons from Heroicons (outline style)
- Active state: bg-blue-50 with left border accent

### Dashboard Cards
**Job Match Cards:**
- White background, rounded-lg, shadow-sm, border border-gray-200
- Header: Job title (bold), company logo/name, match percentage badge
- Body: Key details in 2-column grid (location, salary, status)
- Footer: Action buttons (View Details, Apply, Contact)
- Hover: subtle shadow-md transition

**Stats/Metrics Cards:**
- Compact cards showing: Applications Sent, Interviews Scheduled, Response Rate
- Large number display (text-4xl font-bold)
- Label below (text-sm text-gray-600)
- Optional trend indicator (up/down arrow with percentage)

### Data Displays
**Job Search Results Table:**
- Clean table with alternating row backgrounds (even:bg-gray-50)
- Columns: Job Title, Company, Match %, Status, Date Found, Actions
- Sortable headers with arrow indicators
- Status badges (Applied: green, Pending: yellow, Interview: blue)
- Row hover: bg-blue-50

**Application Tracker Timeline:**
- Vertical timeline with status nodes
- Date labels on left, action items on right
- Color-coded by status (green checkmark = completed, yellow = pending)

### Forms & Inputs
**Search Configuration:**
- Label above input (text-sm font-medium mb-2)
- Input fields: border-gray-300, rounded-md, focus:ring-2 focus:ring-blue-500
- Multi-select tags for job types, locations
- Range sliders for salary expectations

**Script Generator:**
- Template selector dropdown
- Text area for customization (min-h-48)
- Preview pane showing formatted output
- Copy button with success feedback

### Action Components
**Primary CTA:** bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md
**Secondary:** border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md
**Danger/Delete:** bg-red-600 hover:bg-red-700 text-white
**Icon buttons:** p-2 rounded hover:bg-gray-100

### Status Indicators
**Badges:**
- Match percentage: bg-green-100 text-green-800 (>80%), bg-yellow-100 text-yellow-800 (60-80%), bg-gray-100 text-gray-800 (<60%)
- Application status: Small, rounded-full, uppercase text-xs font-medium
- Priority flags: Red dot for HIGH, yellow for MEDIUM

### Modal Overlays
**Job Details Modal:**
- Centered overlay with backdrop blur
- max-w-4xl, max-h-screen with scroll
- Header with close button (X icon)
- Tabbed interface (Overview, Company, Scripts, Contacts)

## Page Layouts

### Dashboard (Home)
- Hero stats row (4 metric cards)
- "Today's Actions" priority list
- "New Matches" job cards grid (3 columns)
- "Recent Activity" timeline

### Job Search Results
- Left sidebar: filters (location, salary, job type)
- Main area: search bar + results table
- Right sidebar: saved searches, quick actions

### Application Manager
- Kanban board view OR table view toggle
- Columns: To Apply, Applied, Follow-up Needed, Interview Scheduled
- Drag-and-drop cards between columns

### Network/Connections
- Grid of contact cards with mutual connection badges
- LinkedIn integration indicators
- Contact info quick-copy buttons

## Visual Treatment
**No color specifications** - focus on structure, hierarchy, spacing
**Emphasis on:** Clean layouts, clear information hierarchy, efficient workflows, professional credibility

## Images
**No hero image needed** - this is a productivity tool, not marketing
**Company logos:** Small thumbnails in job cards (h-8 w-8 rounded)
**Profile photos:** Circular avatars for network connections (h-12 w-12)
**Icons:** Heroicons throughout for actions and navigation