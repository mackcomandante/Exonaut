# Exoasia Exonaut Program — Platform Prototype

A hi-fi clickable prototype of the Exonaut Program platform. Three roles, one
shared mission-control aesthetic, full clickable loop from login through
submission/grading.

---

## Quick start

No build step. Open `Exonaut Platform.html` directly in a modern browser
(Chrome, Safari, Firefox) or via any static server. Everything loads from CDN
(React 18.3.1, Babel standalone, Font Awesome 6.5.2) and from local JSX/JS
files transpiled in-browser.

```bash
# Any static server works:
npx http-server .
# or
python3 -m http.server
```

Then visit `http://localhost:8080/Exonaut%20Platform.html`.

### State is persisted

All in-session state is held in `localStorage` under the `exo:*` namespace. To
reset the prototype (return to login):

```js
// In browser devtools
Object.keys(localStorage).filter(k => k.startsWith('exo:')).forEach(k => localStorage.removeItem(k));
location.reload();
```

Keys used:

| Key | Purpose |
| --- | --- |
| `exo:auth` | `login` · `onboarding` · `app` |
| `exo:role` | `exonaut` · `lead` · `commander` |
| `exo:route` | Current screen id |
| `exo:mission` | Last opened mission id |
| `exo:tweaks` | User's tweak-panel selections |

---

## The three roles

| Role | Persona | Scope |
| --- | --- | --- |
| **Exonaut** (Intern) | Maya Chen, AI-Strat, Week 2, #14/30 | Own dashboard, missions, profile |
| **Mission Lead** (Manager) | Dr. Nadia Oyelaran, AI-Strat | Her track only — 6 Exonauts, grading queue, directives |
| **Mission Commander** (Director) | Mack Comandante, Founder | Org-wide — all 7 leads, escalations, cohort health |

Switch roles via the floating **role switcher** in the top-left of the app
chrome (next to the sidebar). Role choice persists in `localStorage` and
rewires the sidebar + routes.

The reporting chain is real: Commander oversees all Leads; each Lead manages
their track's Exonauts. A submission on the Exonaut side lands live in that
Exonaut's Lead's queue; a grade flows back to the Exonaut's Mission Detail
page.

---

## Key user flows

### Flow A — Exonaut submits a mission

1. Sign in (any credentials) → onboarding pledge + profile + tour
2. Dashboard → click **Competitive Landscape Analysis** (in-progress card)
3. Mission Detail → drop a file in the dropzone + optional note
4. **SUBMIT DELIVERABLE**
5. Toast confirms, status pill flips to "SUBMITTED · AWAITING REVIEW"

### Flow B — Lead grades the submission

1. Role switcher → **Lead**
2. Sidebar → **Review Queue** (the count updates live)
3. Click **GRADE** on the submission
4. Pick a grade (Needs Revision / Good / Excellent), write feedback (≥ 10 chars)
5. **SUBMIT GRADE**

### Flow C — Exonaut sees feedback

1. Switch back to **Exonaut**
2. Open the same mission from the dashboard
3. Green or amber feedback card appears with grade + points awarded

### Flow D — Lead issues a directive

1. Lead → Track Command → **Directives Issued** panel → **NEW DIRECTIVE**
2. Fill the modal (recipient, title, brief, pillar, points, due)
3. Switch to Exonaut → Dashboard shows the **INCOMING DIRECTIVE** banner
4. Exonaut picks **Accept** or **Request Clarification**

### Flow E — Commander oversight

1. Role switcher → **Commander**
2. **Command Bridge** — KPIs + 7-track matrix + escalations + weekly rituals
3. **Escalations** — triage the 4 open items
4. **Cohort Health** — tier distribution, pillar balance, at-risk watchlist, 12-week trajectory

---

## File map

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for deep detail on each file.

```
Exonaut Platform.html    Entry point + script order
styles.css               All styling (mission-control design system)
data.js                  Seed data (USERS, MISSIONS, LEADS, RITUALS, etc.)
primitives.jsx           Avatars, tier crests, badge medallions, arrows
shell.jsx                Sidebar + Topbar + (Exonaut) sidebar
dashboard.jsx            Exonaut dashboard
leaderboard.jsx          Full cohort leaderboard
profile.jsx              Exonaut profile (badge grid, stats, history)
mission.jsx              Mission detail + submission flow
missions list + kudos + rituals + announce + notifications
screens.jsx              + admin + alumni + settings (batched)
auth.jsx                 Login + 4-step onboarding
roles.jsx                Lead + Commander consoles + RoleSwitcher
subs-store.jsx           Shared submissions store (reactive)
directives.jsx           Directive flow (issue / accept / clarify)
extras.jsx               Tweaks panel, Kudos modal, Celebrations, Toasts
app.jsx                  Router + <App/> + role sidebars
README.md                This file
ARCHITECTURE.md          Internals
brief.txt                Original program brief
```

---

## Tweaks (design knobs)

Toggle **Tweaks** in the toolbar. Exposes:

- **Density** — `comfortable` / `default` / `compact`
- **Accent** — `lime` (default) / `platinum` / `lavender`
- **Dashboard variant** — `default` / other layout
- **Ritual style** — `cards` / other
- **Badge shape** — `geom` / other
- **Celebration triggers** — manually fire badge / tier-up / rank / pledge celebrations

Default values live in an `EDITMODE-BEGIN/END` block in
`Exonaut Platform.html` so tweak selections can persist to disk.

---

## Known limitations of the prototype

- Not mobile-optimised past viewport responsiveness — designed 1280–1920.
- `submitDeliverable()` always writes to ME (`u14`); other Exonaut submissions
  are seeded, not user-driven.
- No real backend. `window.__subStore` + `window.__directiveState` are the
  "database". Reload clears any directives issued in-session (the seeded ones
  return).
- Directive / submission stores are in-memory; they do not currently persist
  to `localStorage`. Trivial to add — see ARCHITECTURE.md §State stores.
- Auth is cosmetic — any email/password passes.
- The Lead role is hardcoded to AI-Strat (`lead-ais`) / Dr. Nadia. Commander
  is hardcoded to Mack. Exonaut is hardcoded to Maya Chen (`u14`).

---

## Extending

Most common asks, briefly. Deeper detail in ARCHITECTURE.md.

- **New screen for Exonaut** — add a component, wire a route in `app.jsx` under
  the `roleView === 'exonaut'` branch, add to `Sidebar.links` in `shell.jsx`.
- **New role** — add a sidebar in `app.jsx`, add a role in `RoleSwitcher`
  (`roles.jsx`), branch in `App`'s render.
- **New mission field** — extend the mission objects in `data.js`, render
  wherever needed (most mission rendering is in `mission.jsx` and
  `dashboard.jsx`).
- **Real backend** — replace the `window.__subStore` store with network
  calls; keep the `useSubs()` / `submitDeliverable()` / `gradeSubmission()`
  hook surface stable.
