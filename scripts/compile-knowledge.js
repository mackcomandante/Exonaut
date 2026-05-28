/**
 * compile-knowledge.js
 *
 * Extracts fixed program knowledge from existing source files and outputs
 * knowledge-base.json — the context injected into every AI chat request.
 *
 * Run: node scripts/compile-knowledge.js
 * Output: scripts/knowledge-base.json
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const PROJECT_DIR = path.join(__dirname, '..', 'exoasia-exonaut-program', 'project');
const OUT_FILE      = path.join(__dirname, 'knowledge-base.json');
const FUNCTION_COPY = path.join(__dirname, '..', 'supabase', 'functions', 'chat', 'knowledge-base.json');

// ─── 1. Evaluate data.js in a sandbox to extract constants ────────────────
const dataJs = fs.readFileSync(path.join(PROJECT_DIR, 'data.js'), 'utf8');

const sandbox = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  React: {
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (init) => ({ current: init }),
  },
  console,
  Date, Math, Array, Object, String, Number, JSON, Boolean,
  setTimeout: () => {}, clearTimeout: () => {},
  setInterval: () => {}, clearInterval: () => {},
  Promise,
};
// Make window point to the sandbox so window.X assignments resolve correctly
sandbox.window = sandbox;

try {
  vm.runInNewContext(dataJs, sandbox);
} catch (e) {
  // Errors in the async/Supabase parts are expected — we only need the sync constants
}

const {
  TRACKS       = [],
  TIERS        = {},
  BADGES       = [],
  RITUALS      = [],
  POINTS_RUBRIC = [],
  UNIVERSAL_WEEKS = [],
  TRACK_BRIEFS = {},
  DISCOVERY_TIERS = [],
  COHORT       = {},
} = sandbox;

// ─── 2. Load brief.txt and extract the most useful sections ───────────────
const briefRaw = fs.readFileSync(path.join(PROJECT_DIR, 'brief.txt'), 'utf8');

// Keep only the high-signal sections (strips design/tech-stack/data-model noise)
const KEEP_SECTIONS = [
  '1. Executive Summary',
  '3. User Roles',
  '7. Points System',
  '8. Tier',
  '9. Badge System',
  '11. Mission Management',
  '12. Peer Kudos',
  '13. Weekly Rituals',
  '14. Announcements',
];

function extractSections(text, sectionHeaders) {
  const lines  = text.split('\n');
  const result = [];
  let capturing = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = sectionHeaders.some(h => line.includes(h));
    const isDivider = line.includes('────────────────────');

    if (isHeader) {
      capturing = true;
    }
    if (capturing) {
      if (isDivider && result.length > 0) {
        result.push('');
        capturing = false;
        continue;
      }
      result.push(line);
    }
  }
  return result.join('\n').replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/\s{3,}/g, '\n\n').trim();
}

const briefSummary = extractSections(briefRaw, KEEP_SECTIONS);

// ─── 3. Build structured knowledge object ─────────────────────────────────
const knowledge = {
  meta: {
    generatedAt: new Date().toISOString(),
    description: 'Exonaut Program fixed knowledge base — injected as AI context.',
  },

  program: {
    name: 'Exonaut Program',
    organization: 'Exoasia Innovation Hub',
    cohort: COHORT,
    summary: briefSummary,
  },

  roles: {
    exonaut:   'Active intern. Can view their own dashboard, submit missions, give kudos, view the leaderboard.',
    lead:      'Mission Lead / Track Lead. Manages a track, grades submissions, awards kudos, views their cohort.',
    commander: 'Mission Commander. Cohort-wide oversight, escalations, health checks, EOW awards.',
    admin:     'Platform Admin. Full access — cohort management, user management, missions, badges, points, reports.',
    alumni:    'Exonaut Corps. Read-only access to own profile, badges, mission history, alumni directory.',
  },

  tiers: Object.entries(TIERS).map(([key, t]) => ({
    key,
    label:    t.label,
    short:    t.short,
    minPoints: t.min,
    color:    t.color,
  })),

  tracks: TRACKS.map(t => ({
    code:        t.code,
    name:        t.name,
    short:       t.short,
    objective:   t.objective,
    clientType:  t.clientType,
    leadTitle:   t.leadTitle,
    trackBadge:  t.trackBadge,
  })),

  rituals: RITUALS.map(r => ({
    id:     r.id,
    name:   r.name,
    points: r.points,
  })),

  pointsRubric: POINTS_RUBRIC.map(r => ({
    group:  r.group,
    action: r.label,
    points: r.pts,
    note:   r.note,
  })),

  discoveryTiers: DISCOVERY_TIERS.map(d => ({
    tier:        d.tier,
    minMeetings: d.minMeetings,
    points:      d.pts,
    note:        d.note,
  })),

  badges: BADGES.map(b => ({
    code:     b.code,
    name:     b.name,
    subtitle: b.subtitle,
    category: b.category,
  })),

  universalWeeks: UNIVERSAL_WEEKS.map(w => ({
    week:         w.week,
    title:        w.title,
    pointsRange:  w.ptsRange,
    badgeEligible: w.badgeEligible || null,
    missions:     (w.missions || []).map(m => ({
      number: m.n,
      points: m.pts,
      task:   m.text,
    })),
  })),

  trackBriefs: Object.fromEntries(
    Object.entries(TRACK_BRIEFS).map(([trackCode, weeks]) => [
      trackCode,
      weeks.map(w => ({
        week:         w.week,
        title:        w.title,
        pointsRange:  w.ptsRange,
        badgeEligible: w.badgeEligible || null,
        missions:     w.missions || [],
      })),
    ])
  ),
};

// ─── 4. Write output ───────────────────────────────────────────────────────
const json = JSON.stringify(knowledge, null, 2);
fs.writeFileSync(OUT_FILE, json, 'utf8');
fs.mkdirSync(path.dirname(FUNCTION_COPY), { recursive: true });
fs.writeFileSync(FUNCTION_COPY, json, 'utf8');

const sizeKb = Math.round(fs.statSync(OUT_FILE).size / 1024);
console.log(`✓ knowledge-base.json written (${sizeKb} KB)`);
console.log(`  Tracks: ${knowledge.tracks.length}`);
console.log(`  Badges: ${knowledge.badges.length}`);
console.log(`  Rituals: ${knowledge.rituals.length}`);
console.log(`  Points rubric entries: ${knowledge.pointsRubric.length}`);
console.log(`  Universal weeks: ${knowledge.universalWeeks.length}`);
console.log(`  Track briefs: ${Object.keys(knowledge.trackBriefs).length} tracks × weeks`);
console.log(`  Brief summary: ${knowledge.program.summary.length} chars`);
