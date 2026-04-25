# Architecture — Exonaut Platform

Implementation reference for devs extending the prototype.

---

## Runtime model

- Single HTML file (`Exonaut Platform.html`) loads React 18, ReactDOM, and
  Babel Standalone from CDN.
- Each component file is a `<script type="text/babel">`. Babel transpiles in
  the browser on load.
- **No module system.** Files share scope via `window`. Every component file
  ends with `Object.assign(window, { Foo, Bar })` and earlier files must load
  before files that reference them (see "Script order" below).
- Plain data is in `data.js` (no JSX) — loaded first, no Babel transform.

### Script order (enforced in `Exonaut Platform.html`)

```
data.js
primitives.jsx
shell.jsx
dashboard.jsx
leaderboard.jsx
profile.jsx
mission.jsx
extras.jsx
auth.jsx
screens.jsx
subs-store.jsx    ← must precede roles.jsx & app.jsx (provides useSubs)
directives.jsx    ← must precede roles.jsx & app.jsx
roles.jsx
app.jsx           ← always last; calls ReactDOM.createRoot
```

Break this order and you'll get `ReferenceError: X is not defined` at runtime.

---

## State architecture

### 1. App-level state (`app.jsx`)

React `useState` in `<App/>`. Owned and passed down via props:

| State | Type | Purpose |
| --- | --- | --- |
| `authStage` | `'login' \| 'onboarding' \| 'app'` | Gate before the shell renders |
| `roleView` | `'exonaut' \| 'lead' \| 'commander'` | Which console is active |
| `route` | string | Current screen (see routing table below) |
| `missionId` | string | Which mission the Mission Detail screen should load |
| `tweaks` | object | Design-knob overrides |
| `celebration`, `kudosOpen`, `toasts` | — | Ephemeral UI |

Persisted to `localStorage` on every change via `useEffect`.

### 2. Shared submission store (`subs-store.jsx`)

A module-level reactive store — **not** React Context, because the Role
Switcher mounts/unmounts entire subtrees. The store outlives remounts.

```js
window.__subStore = {
  subs:     [...],        // all submissions, pending + graded
  listeners: Set<fn>,     // components subscribed via useSubs()
};

// Hook
const subs = useSubs();   // re-renders when store changes

// Mutations
submitDeliverable({ missionId, missionTitle, fileName, note });
gradeSubmission({ subId, grade, feedback });

// Query helper
getMySubmission(missionId);   // finds ME_ID's submission for mission
```

Submissions have shape:

```js
{
  id: 'sub-xxx',
  missionId, missionTitle,
  exonautId,                    // whose sub
  submittedAt, wordCount, fileName, note,
  deliverable: 'document' | 'presentation' | ...,
  isLate: boolean,
  state: 'pending' | 'approved' | 'needs-revision',
  grade: null | 'good' | 'excellent' | 'needs-revision',
  feedback: string | null,
  pointsAwarded: number | null,
}
```

Point awards are hardcoded in `gradeSubmission`:
`needs-revision: +5 · good: +10 · excellent: +20`.

### 3. Shared directive store (`directives.jsx`)

Mirrors the submission store exactly — same pattern, different shape.

```js
window.__directiveState = {
  directives: [...],
  listeners: Set<fn>,
};

const dirs = useDirectives();   // hook
```

Directives have shape:

```js
{
  id: 'DIR-AIS-2026-NNN',
  from: 'lead-ais',             // LEADS[i].id
  to:   'u14',                  // USERS[i].id
  title, brief,
  pillar: 'project' | 'client' | 'recruitment',
  deliverable: 'document' | 'presentation' | 'video' | 'link' | 'code',
  points, dueDate, dueTime,
  issuedAt,
  status: 'pending' | 'accepted' | 'clarification',
  clarificationNote?: string,
}
```

The Exonaut Dashboard top-mounts `<DirectiveInbox/>`, which renders any
`status: 'pending'` directive addressed to `ME_ID` with Accept /
Request-Clarification actions.

### Why two stores instead of one?

The submission and directive lifecycles are independent and the shapes
diverge. Merging would create a messy discriminated union for no gain. If a
third live store appears, promote the pattern into a shared helper.

---

## Routing

String-based. `route` in `<App/>` is matched via `if/else` to a React element.

| route | Role | Screen |
| --- | --- | --- |
| `dashboard` | Exonaut | Dashboard |
| `leaderboard` | Exonaut | Leaderboard |
| `profile` | Exonaut | Profile |
| `missions` | Exonaut | Missions list |
| `mission` | Exonaut | Mission detail (reads `missionId` state) |
| `kudos` | Exonaut | Kudos feed |
| `rituals` | Exonaut | Rituals page |
| `announce` | Exonaut | Announcements |
| `notifications` | Exonaut | Notifications |
| `admin` | Exonaut | Admin console |
| `alumni` | Exonaut | Alumni corps |
| `settings` | Exonaut | Settings |
| `lead-home` | Lead | Track Command |
| `lead-roster` | Lead | Roster |
| `lead-queue` | Lead | Review Queue |
| `lead-grade` | Lead | Grade submission (pick first pending) |
| `lead-grade:SUB-ID` | Lead | Grade specific submission |
| `cmdr-home` | Commander | Command Bridge |
| `cmdr-leads` | Commander | Mission Leads |
| `cmdr-esc` | Commander | Escalations |
| `cmdr-health` | Commander | Cohort Health |

The `lead-grade:SUB-ID` form is the only parameterised route. `app.jsx`
extracts `subId` via `route.split(':')[1]` and passes it to `<LeadGrade/>`.

**`navigate(id)` is the only way to change route.** It scrolls to top and
writes `localStorage`.

---

## Role switching

`<RoleSwitcher/>` (defined in `roles.jsx`) renders three pill buttons in a
fixed bar at the top-left of the shell. Clicking one calls `switchRole(r)` in
`app.jsx`, which:

1. Updates `roleView`
2. Routes to that role's home (`dashboard` / `lead-home` / `cmdr-home`)
3. Scrolls to top

The identity rendered in the sidebar + throughout is hardcoded per role:

| Role | Identity | Defined in |
| --- | --- | --- |
| Exonaut | `ME = USERS.find(u => u.id === ME_ID)` where `ME_ID = 'u14'` (Maya Chen) | `data.js` |
| Lead | `'lead-ais'` → Dr. Nadia Oyelaran | hardcoded in `roles.jsx` + `app.jsx` LeadSidebar |
| Commander | Mack Comandante | hardcoded in `roles.jsx` + `app.jsx` CommanderSidebar |

To parameterise (e.g. let the user pick which Lead they're playing as), lift
`leadId` to `<App/>` state and thread it through.

---

## Data model (`data.js`)

All seed data. Loaded first (plain JS). Globals:

| Global | Shape | Notes |
| --- | --- | --- |
| `COHORT` | `{ code, name, week, weekTotal, size, startDate, demoDay }` | Week 2 of 12 |
| `TRACKS` | `[{ code, name, short }]` | 7 tracks |
| `TIERS` | `{ entry \| builder \| prime \| elite \| apex \| corps: { label, short, color, min } }` | Points → tier |
| `USERS` | 30 Exonauts, `u01…u30` | Includes `{ id, name, track, points, tier, change, badges, p1, p2, p3 }`. `u14` has `me: true`. |
| `MISSIONS` | Array, id schema `EXO-MSN-{TRACK}-{YEAR}-{NNN}` | Track-specific + `track: null` for all-cohort |
| `RITUALS` | Weekly rituals with state | |
| `BADGES` | Full catalog (milestone / track / pillar / special) | |
| `ACTIVITY` | Feed items for Exonaut dashboard | |
| `ME`, `ME_ID`, `ME_RANK` | Resolved references to Maya | |
| `COMMANDER` | `{ id, name, role, title, ... }` | Mack |
| `LEADS` | 7 Mission Leads, one per track, `reports: [userIds]` | |
| `PENDING_SUBS` | Seed for the submission store | Loaded into `__subStore` on init |
| `ESCALATIONS` | Commander dashboard items | |
| `DIRECTIVES` | Seed for the directive store | |
| `ROLE_IDENTITIES` | Convenience map for switching | |

### Adding a new Exonaut

```js
// data.js — USERS array
{ id: 'u31', name: 'New Name', track: 'AIS', points: 0, tier: 'entry',
  change: 0, badges: 0, p1: 0, p2: 0, p3: 0 },
```

Then add `u31` to the matching Lead's `reports` array in `LEADS`.

### Adding a new mission

```js
// data.js — MISSIONS array
{
  id: 'EXO-MSN-AIS-2026-005',
  title: 'Mission title',
  track: 'AIS',                           // or null for all-cohort
  pillar: 'project',                       // project | client | recruitment
  points: 25,
  dueIn: 3,                                // days — negative = past due
  dueDate: 'OCT 27',
  status: 'not-started',                   // not-started | in-progress | submitted | approved
  deliverable: 'document',                 // document | presentation | video | link | code
  description: 'Markdown-ish...',
  criteria: ['Criterion 1', 'Criterion 2'],
},
```

---

## Design system

All styling lives in `styles.css`. Tokens in `:root`:

```
--bg-deep, --bg-darkest, --card-base     Surfaces
--off-white / 07 / 40 / 68                Text tiers
--lime, --platinum, --lavender            Accents (--lime is the primary)
--amber, --red, --green, --gold           Status colors
--font-display (Montserrat)
--font-serif (EB Garamond)
--font-mono (JetBrains Mono)
```

`--lime` is overridden at runtime by the accent tweak via
`document.documentElement.style.setProperty('--lime', hex)`.

Key reusable classes: `.card-panel`, `.card-flat`, `.card-hud`, `.btn`,
`.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.t-title`,
`.t-heading`, `.t-label`, `.t-label-muted`, `.t-body`, `.t-mono`, `.input`,
`.textarea`, `.status-pill`, `.section-head`, `.section-meta`, `.lb-table`,
`.lb-row`, `.lb-header`, `.enter` (fade-in animation).

---

## Tweaks system

Defined in `extras.jsx` (`<TweaksFab/>`, `<TweaksPanel/>`). Tweaks are applied
in `<App/>` by setting `document.body.dataset.{density,accent}` and mutating
`--lime`. CSS consumes via `body[data-density="compact"] ...`.

To add a new tweak:
1. Add to the `mergedTweaks` defaults in `app.jsx`
2. Add to the `EDITMODE-BEGIN` block in `Exonaut Platform.html`
3. Add a control in `<TweaksPanel/>`
4. Consume in CSS (`body[data-xxx="..."]`) or JS

---

## Gotchas

- **Scope collisions.** No module system — don't name two components the
  same thing across files. Namespace with the feature (`LeadHome`, not `Home`).
- **Never `const styles = {…}`** at module top level — it'll collide with
  another file. Use `leadStyles` or inline styles.
- **Font Awesome integrity hash** was previously pinned and caused a load
  failure. We dropped the hash. If upgrading, either use a matching hash or
  leave it off.
- **Babel Standalone** is slow (~500ms first paint). Acceptable for a
  prototype; for production, pre-build.
- **`console.log` leaks** — the shared stores mutate `window.__*`. Open
  devtools and inspect `window.__subStore.subs` to watch live.
- **Role sidebar active-state**: when `route === 'lead-grade:sub-xyz'`, the
  sidebar needs to match `'lead-grade'`. `app.jsx` strips the suffix before
  passing `current` to the sidebar — don't break this.
- **Reading `mission.feedback` vs submission feedback**: the Exonaut's
  Mission Detail coalesces `mission.feedback` (seeded, pre-existing) with
  `mySub.feedback` (live from the store). `mySub` wins when present.

---

## Where each flow is implemented

| Flow | Files |
| --- | --- |
| Login + onboarding | `auth.jsx` |
| Exonaut dashboard | `dashboard.jsx`, `directives.jsx` (inbox banner) |
| Submit deliverable | `mission.jsx` → `submitDeliverable()` in `subs-store.jsx` |
| Lead review queue | `roles.jsx` → `LeadQueue` reads `useSubs()` |
| Lead grade submission | `roles.jsx` → `LeadGrade` calls `gradeSubmission()` |
| Feedback appears on Exonaut side | `mission.jsx` reads `getMySubmission()` |
| Issue directive | `directives.jsx` → `AssignDirectiveModal` |
| Accept/Clarify directive | `directives.jsx` → `DirectiveInbox` mutates store |
| Commander oversight | `roles.jsx` → `CommanderHome/Leads/Escalations/Health` |
| Leaderboard | `leaderboard.jsx` |
| Profile / badges | `profile.jsx`, `primitives.jsx` (BadgeMedallion) |
| Kudos | `extras.jsx` (modal), `screens.jsx` (feed page) |

---

## Adding a real backend

The store surface is narrow on purpose. To migrate:

1. Replace `submitDeliverable` / `gradeSubmission` with `fetch` calls.
2. Replace the polling-free `listeners` broadcast with WebSocket or SWR-style
   revalidation.
3. Keep `useSubs()` and `getMySubmission()` signatures identical.
4. Do the same for `useDirectives()` in `directives.jsx`.

`ME_ID` should come from auth (`/me`) rather than being hardcoded. `LEADS`,
`USERS`, `MISSIONS` all become API-backed lists; the rendering code already
assumes array shapes.
