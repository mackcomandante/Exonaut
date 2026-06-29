# Exonaut Platform — Project Handover Proposal

**Prepared by:** Nikko  
**Date:** June 25, 2026  
**Project:** Exonaut — Exoasia Internship Management Platform  
**Handover Type:** End-of-Internship Project Transition

---

## 1. Executive Summary

This document serves as a formal handover of the **Exonaut Platform**, a full-featured internship management web application built for the Exoasia program. The platform was developed during my internship tenure as a functional, demo-ready prototype covering three user roles (Exonaut, Mission Lead, Mission Commander), a gamified point-and-badge system, a submission-and-grading workflow, weekly rituals, peer recognition, and an admin console.

The platform is deployed on Vercel and backed by Supabase (PostgreSQL + Auth). It is structured to be extended into a production system with minimal architectural changes.

---

## 2. Project Overview

| Attribute | Detail |
|-----------|--------|
| **Platform Name** | Exonaut |
| **Purpose** | Internship/fellowship management for Exoasia's 12-week cohort program |
| **Users** | ~30 Exonauts (interns), 7 Mission Leads, 1 Mission Commander |
| **Entry Point** | `Exonaut Platform.html` |
| **Deployment** | Vercel (static) |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions) |
| **Repository** | Local — `Exonaut-main/` |

---

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3.1 (via CDN, no build step) |
| Transpiler | Babel Standalone 7.29.0 (in-browser) |
| Styling | Custom CSS design system (`styles.css`) |
| Icons | Font Awesome 6.5.2 |
| Fonts | Google Fonts (Montserrat, EB Garamond, JetBrains Mono) |
| Backend | Supabase (PostgreSQL + Auth + Row-Level Security) |
| Serverless Functions | Deno (Supabase Edge Functions) |
| AI Chat | Groq API (via Edge Function) |
| State Management | React `useState` + global window-scoped stores |
| Persistence | localStorage (`exo:*` keys) + Supabase tables |
| Deployment | Vercel (`vercel.json` with HTML rewrites) |

> **No build process required.** The app runs by opening `Exonaut Platform.html` in a browser or serving it with any static file server.

---

## 4. Features Delivered

### 4.1 Exonaut Console (Intern View)

| Feature | Status |
|---------|--------|
| Dashboard — hero stats, pillar scores, activity feed | Complete |
| Missions list with status tracking | Complete |
| Mission detail — brief, criteria, file submission | Complete |
| Leaderboard — cohort ranking with tabs & filters | Complete |
| Profile — editable bio, LinkedIn, school, avatar | Complete |
| Badge gallery (22 badges across 4 categories) | Complete |
| Kudos — peer-to-peer appreciation feed | Complete |
| Weekly Rituals (Monday Ignition, Mid-Week Pulse, Friday Win Wall) | Complete |
| Announcements & Notifications feed | Complete |
| Community board & message threads | Complete |
| Projects workspace | Complete |
| Alumni Corps directory | Complete |
| Settings panel | Complete |
| Certificate templates | Complete |
| Social share cards | Complete |

### 4.2 Mission Lead Console (Manager View)

| Feature | Status |
|---------|--------|
| Track Command dashboard — queue, avg points, submit rate | Complete |
| Roster view — all 4–6 Exonauts under lead | Complete |
| Review Queue — live pending submissions with SLA alerts | Complete |
| Grade Submission — grade + feedback + points award | Complete |
| Directives — issue tasks with pillar, points, due date | Complete |
| Announcements — track-scoped broadcasts | Complete |
| Projects management | Complete |
| Lead profile view | Complete |

### 4.3 Mission Commander Console (Director View)

| Feature | Status |
|---------|--------|
| Command Bridge — org-wide KPIs, 7-track matrix | Complete |
| Mission Leads roster with health metrics | Complete |
| Escalations triage board | Complete |
| Cohort Health — tier distribution, at-risk watchlist | Complete |
| Exonaut of the Week award flow | Complete |
| Org-wide announcements | Complete |
| Commander profile | Complete |

### 4.4 Platform Admin Console

| Feature | Status |
|---------|--------|
| Cohort management | Complete |
| Track creation | Complete |
| Exonaut assignment | Complete |
| User directory | Complete |
| System console | Complete |
| Project builder | Complete |
| User removal / offboarding flow | Complete |

### 4.5 Gamification & Engagement System

- Point ledger with 3-pillar weighting (Execution 40% / Collaboration 35% / Growth 25%)
- Tier system (Cadet → Scout → Ranger → Pathfinder → Pioneer → Vanguard)
- 22 badges (milestone / track / pillar / special) with auto-award triggers
- Weekly crown / Intern of the Week rotation
- Celebration animations & toast notifications

---

## 5. File & Architecture Map

```
Exonaut-main/
├── Exonaut Platform.html     ← App entry point; controls script load order
├── styles.css                ← Full design system (~67KB)
├── data.js                   ← Seed/mock data (cohort, users, missions, tracks)
│
├── app.jsx                   ← Root router, auth state, role switching
├── shell.jsx                 ← Sidebar & topbar navigation
├── auth.jsx                  ← Login, signup, 4-step pledge onboarding
├── primitives.jsx            ← Shared UI: AvatarWithRing, BadgeMedallion, TierCrest
│
├── dashboard.jsx             ← Exonaut dashboard
├── mission.jsx               ← Mission detail + submission flow
├── leaderboard.jsx           ← Cohort leaderboard
├── profile.jsx               ← Exonaut profile
├── screens.jsx               ← Batched screens: missions list, kudos, rituals,
│                                 announcements, notifications, community,
│                                 projects, alumni, settings
│
├── roles.jsx                 ← Lead console + Commander console
├── directives.jsx            ← Directive issue/accept/clarify flow
├── eow.jsx                   ← Exonaut of the Week flow
├── admin.jsx                 ← Platform admin console
│
├── subs-store.jsx            ← Submission state store
├── points-store.jsx          ← Points ledger
├── user-store.jsx            ← User registry (v1)
├── user-store-v2.jsx         ← User registry (v2, enhanced)
├── announcement-store.jsx    ← Announcements state
├── kudos-store.jsx           ← Peer kudos state
├── ritual-store.jsx          ← Ritual tracking state
├── cohort-store.jsx          ← Cohort-wide state
├── manager-store.jsx         ← Lead/manager state
├── removal-store.jsx         ← User removal/offboarding
├── notif-store.jsx           ← Notifications state
├── board-store.jsx           ← Community board state
├── crown-store.jsx           ← Weekly crown/IOW tracking
├── project-store.jsx         ← Project workspace state (~74KB)
│
├── auto-score.jsx            ← Badge auto-award on point thresholds
├── cert-templates.jsx        ← Badge & certificate rendering
├── community-board.jsx       ← Community forums
├── extras.jsx                ← Tweaks panel, kudos modal, celebrations, toasts
├── announce-ui.jsx           ← Announcement UI (lead/commander)
├── removals-ui.jsx           ← User removal UI
├── share-card.jsx            ← Social share cards
├── role-profile.jsx          ← Lead & commander profile views
├── weekly-points.jsx         ← Weekly points summary
├── supabase-profile.jsx      ← Supabase-backed profile updates
│
├── supabase-client.js        ← Supabase init (URL + anon key)
├── supabase/functions/
│   ├── chat/index.ts         ← AI chat (Groq API)
│   └── delete-user/index.ts  ← Account deletion function
│
├── migrations/ (20 SQL files)← Full DB schema, RLS, seed helpers
│
├── README.md                 ← Quick start & usage guide
├── ARCHITECTURE.md           ← Deep technical reference
├── vercel.json               ← Deployment config
└── scripts/knowledge-base.json ← AI chat knowledge base
```

---

## 6. Database Schema Summary

The Supabase database is built via 20 migration files in `/migrations/`. Key tables:

| Table | Purpose |
|-------|---------|
| `user_profiles` | Exonaut & staff profile data, tier, cohort assignment |
| `registered_users` | Auth-linked user records |
| `submissions` | Mission deliverable submissions |
| `submissions_grades` | Grades, feedback, and points per submission |
| `missions` | Mission briefs and metadata |
| `kudos` | Peer kudos records |
| `badges_earned` | Awarded badge instances per user |
| `announcements` | Track and org-wide broadcasts |
| `notifications` | Per-user notification feed |
| `rituals_logged` | Ritual participation records |
| `projects` | Collaborative track projects |
| `work_items` | Tasks within projects |
| `action_register` | Project action tracking |
| `crown_rotation` | Weekly Intern of the Week history |

All tables include Row-Level Security (RLS) policies. See `/migrations/` for full schema details.

---

## 7. Environment & Access Requirements

The incoming team/developer will need access to:

| Resource | Notes |
|----------|-------|
| Supabase project | URL and anon key are in `supabase-client.js` |
| Supabase dashboard | For DB management, auth users, edge function deployment |
| Vercel project | For redeployment; linked to the static HTML entry point |
| Groq API key | Required for the AI chat edge function (`GROQ_API_KEY` env var in Supabase) |
| Git repository | Current codebase lives locally; recommend pushing to GitHub for continuity |

---

## 8. Known Limitations & Technical Debt

| Issue | Impact | Recommended Fix |
|-------|--------|----------------|
| No build toolchain (Babel in-browser) | Slow initial load; no tree-shaking; no TypeScript | Migrate to Vite + React |
| Window-scoped modules | Risk of naming collisions as codebase grows | Migrate to ES modules with proper imports |
| `user-store.jsx` has two versions (v1 and v2) | Potential state divergence | Consolidate into a single store |
| `project-store.jsx` is 74KB | Harder to maintain | Split into domain-specific slices |
| `screens.jsx` is 112KB | Single large file for many screens | Split into individual screen files |
| Mobile not optimized | Desktop-only UX | Add responsive breakpoints |
| Roles partially hardcoded | Auth is cosmetic in some areas | Full Supabase Auth role enforcement |
| No automated tests | Regressions require manual QA | Add Vitest + React Testing Library |
| AI chat (Groq) not deeply integrated | Standalone edge function | Expand knowledge base and surface in more screens |

---

## 9. Recommended Next Steps

### Immediate (0–2 weeks)
- [ ] Push the codebase to a GitHub repository for version control continuity
- [ ] Confirm all 20 SQL migrations have been run against the production Supabase instance
- [ ] Verify Vercel deployment is live and ENV vars (Groq key) are set
- [ ] Document Supabase project credentials in a secure credential store

### Short-Term (1–2 months)
- [ ] Migrate build system to **Vite** to eliminate in-browser Babel and enable proper bundling
- [ ] Convert window-scoped components to proper ES module imports
- [ ] Split `screens.jsx` and `project-store.jsx` into smaller files
- [ ] Consolidate `user-store.jsx` + `user-store-v2.jsx` into one store
- [ ] Add responsive CSS for tablet/mobile support

### Medium-Term (2–4 months)
- [ ] Enforce full role-based access via Supabase RLS (remove any hardcoded role overrides)
- [ ] Replace `data.js` seed data with fully database-driven content
- [ ] Add a proper test suite (Vitest, React Testing Library)
- [ ] Expand AI chat knowledge base and surface it across more screens
- [ ] Build a cohort onboarding flow for new batch intake

### Long-Term
- [ ] Native mobile app or PWA for Exonauts
- [ ] Real-time notifications via Supabase Realtime
- [ ] Analytics dashboard for program directors
- [ ] Multi-cohort support (currently single-cohort focused)

---

## 10. Handover Checklist

- [x] Codebase documented (`README.md`, `ARCHITECTURE.md`)
- [x] 20 SQL migration files covering full DB schema
- [x] Vercel deployment configuration (`vercel.json`)
- [x] Supabase edge functions in `/supabase/functions/`
- [x] AI chat knowledge base (`/scripts/knowledge-base.json`)
- [ ] Supabase credentials transferred to incoming team
- [ ] Vercel project access transferred or re-linked
- [ ] GitHub repository created and codebase pushed
- [ ] Walkthrough session with incoming developer / next intern
- [ ] Groq API key transferred or regenerated for new owner

---

## 11. Contact

**Outgoing Developer:** Nikko  
**Email:** createcodedevelop@gmail.com  
**Internship Period:** Exoasia Batch (concluded June 25, 2026)

For technical questions about specific components, refer first to `ARCHITECTURE.md` which covers the runtime model, state architecture, routing, and known gotchas in depth.

---

*This handover document was prepared at the conclusion of the internship engagement. All deliverables listed above are present in the project directory and ready for review.*
