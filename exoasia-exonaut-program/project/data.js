// Exonaut Platform — seed data for mid-pack Prime persona in Week 2

const COHORT = {
  code: 'EXO-BATCH-2026',
  name: 'Batch 2026–2027',
  week: 2,
  weekTotal: 12,
  size: 30,
  startDate: 'OCT 06 2026',
  demoDay: 'JAN 29 2027',
};

// Cohort registry — Commander can switch between batches and create new ones.
// Each USER below carries a `cohort` field pointing to a cohort id.
const COHORTS = [
  { id: 'c2627', name: 'Batch 2026–2027', code: 'EXO-B-2627', status: 'active',   start: 'OCT 06 2026', end: 'JAN 29 2027', color: '#C9E500' },
  { id: 'c2526', name: 'Batch 2025–2026', code: 'EXO-B-2526', status: 'alumni',   start: 'OCT 07 2025', end: 'JAN 30 2026', color: '#B095C5' },
  { id: 'c2425', name: 'Batch 2024–2025', code: 'EXO-B-2425', status: 'alumni',   start: 'OCT 08 2024', end: 'JAN 31 2025', color: '#B095C5' },
];

// 7 tracks from Exonaut Mission Briefs · Batch 2026–2027
const TRACKS = [
  { code: 'AIS', name: 'AI Strategy & Advisory',   short: 'AI-STRAT',  emoji: '🤖',
    objective: 'Deliver a comprehensive AI Readiness Assessment and Strategic Roadmap for a real enterprise client, culminating in a signed advisory engagement and a board-ready presentation.',
    clientType: 'Philippine or ASEAN enterprise considering AI adoption',
    leadTitle: 'Senior AI Advisor / Principal Consultant',
    trackBadge: 'AI Strategist' },
  { code: 'VB',  name: 'EBELI Venture Building',   short: 'VENTURE',   emoji: '🚀',
    objective: 'Take a founder or startup client from a raw idea through the full EBELI methodology — from concept validation and TRL assessment to an investor-ready pitch deck and prototype plan.',
    clientType: 'Early-stage founder or startup seeking to build an AI-powered company',
    leadTitle: 'Venture Lead / Exoasia Partner',
    trackBadge: 'Venture Builder' },
  { code: 'LD',  name: 'Learning & Development',   short: 'L&D',       emoji: '🎓',
    objective: 'Design and deliver an AI literacy or upskilling program for a real organizational client, from needs assessment through a live workshop pilot and full curriculum package.',
    clientType: 'HR, L&D, or OD team at a corporation, government agency, or academic institution',
    leadTitle: 'L&D Lead / Senior Program Designer',
    trackBadge: 'L&D Champion' },
  { code: 'XM',  name: 'Events & Experiences',     short: 'EVENTS',    emoji: '🎟',
    objective: 'Design and deliver a real high-impact event or experiential activation for a client, from brief to run-of-show to live execution.',
    clientType: 'Brand, institution, or organization planning an event or launch',
    leadTitle: 'Events & Experience Lead',
    trackBadge: 'Experience Maker' },
  { code: 'AID', name: 'AI-Native Software',       short: 'AI-DEV',    emoji: '💻',
    objective: 'Ship a working AI-powered software product for a real client — from spec through prototype to deployed, user-tested build.',
    clientType: 'SME, startup, or internal team needing an AI-native tool or workflow',
    leadTitle: 'Principal Engineer / AI Build Lead',
    trackBadge: 'AI Dev Builder' },
  { code: 'POL', name: 'Research, Policy & Insight', short: 'POLICY', emoji: '📚',
    objective: 'Produce a rigorous research, policy, or industry-insight report for a real client — from brief through primary research to publication-ready document.',
    clientType: 'Think tank, government agency, industry body, or enterprise research function',
    leadTitle: 'Research Lead / Policy Director',
    trackBadge: 'Policy Analyst' },
  { code: 'CC',  name: 'Social Media Marketing',   short: 'SOCIAL',    emoji: '📲',
    objective: 'Build and execute a full AI-powered social media strategy for a real client, including brand audit, content system, platform growth, and measurable results.',
    clientType: 'Brand, startup, or organization seeking to grow digital presence',
    leadTitle: 'Content & Brand Lead',
    trackBadge: 'Content Creator' },
];

const TIERS = {
  entry:   { label: 'Exonaut',        short: 'ENTRY',    color: '#C9F24A', min: 0   },
  builder: { label: 'Exonaut Builder',short: 'BUILDER',  color: '#E08A3C', min: 100 },
  prime:   { label: 'Exonaut Prime',  short: 'PRIME',    color: '#B8C2CE', min: 300 },
  elite:   { label: 'Exonaut Elite',  short: 'ELITE',    color: '#C9A000', min: 600 },
  apex:    { label: 'Exonaut Apex',   short: 'APEX',     color: '#8BE8FF', min: 900 },
  corps:   { label: 'Exonaut Corps',  short: 'CORPS',    color: '#B095C5', min: null },
};

// Full cohort of 30 — realistic Week 2 distribution
const USERS = [
  { id: 'u01', name: 'Kai Nakamura',      track: 'AID', points: 512, tier: 'prime',   change: +2, badges: 4, p1: 240, p2: 170, p3: 102 , cohort: 'c2627' },
  { id: 'u02', name: 'Sade Obanjo',       track: 'AIS', points: 498, tier: 'prime',   change: +5, badges: 4, p1: 235, p2: 165, p3: 98 , cohort: 'c2627' },
  { id: 'u03', name: 'Mira Kovač',        track: 'VB',  points: 471, tier: 'prime',   change: -1, badges: 3, p1: 220, p2: 161, p3: 90 , cohort: 'c2627' },
  { id: 'u04', name: 'Jonas Reichel',     track: 'POL', points: 455, tier: 'prime',   change: +1, badges: 3, p1: 215, p2: 150, p3: 90 , cohort: 'c2627' },
  { id: 'u05', name: 'Priya Ravindran',   track: 'AIS', points: 432, tier: 'prime',   change: +4, badges: 3, p1: 198, p2: 148, p3: 86 , cohort: 'c2627' },
  { id: 'u06', name: 'Theo Marchetti',    track: 'XM',  points: 418, tier: 'prime',   change: 0,  badges: 3, p1: 188, p2: 152, p3: 78 , cohort: 'c2627' },
  { id: 'u07', name: 'Amani Djeredou',    track: 'LD',  points: 401, tier: 'prime',   change: +3, badges: 3, p1: 182, p2: 148, p3: 71 , cohort: 'c2627' },
  { id: 'u08', name: 'Isra Halabi',       track: 'CC',  points: 389, tier: 'prime',   change: -2, badges: 2, p1: 174, p2: 140, p3: 75 , cohort: 'c2627' },
  { id: 'u09', name: 'Dmitri Laskaris',   track: 'AID', points: 377, tier: 'prime',   change: +1, badges: 2, p1: 172, p2: 138, p3: 67 , cohort: 'c2627' },
  { id: 'u10', name: 'Fernanda Quispe',   track: 'VB',  points: 368, tier: 'prime',   change: +2, badges: 2, p1: 168, p2: 130, p3: 70 , cohort: 'c2627' },
  { id: 'u11', name: 'Wren Abernathy',    track: 'POL', points: 361, tier: 'prime',   change: -3, badges: 2, p1: 160, p2: 132, p3: 69 , cohort: 'c2627' },
  { id: 'u12', name: 'Yuki Tomlinson',    track: 'XM',  points: 358, tier: 'prime',   change: 0,  badges: 2, p1: 158, p2: 128, p3: 72 , cohort: 'c2627' },
  { id: 'u13', name: 'Bastien Okafor',    track: 'AIS', points: 352, tier: 'prime',   change: +4, badges: 2, p1: 165, p2: 122, p3: 65 , cohort: 'c2627' },
  { id: 'u14', name: 'Maya Chen',         track: 'AIS', points: 347, tier: 'prime',   change: +3, badges: 3, p1: 162, p2: 125, p3: 60, me: true , cohort: 'c2627' },
  { id: 'u15', name: 'Rafaela Quattro',   track: 'LD',  points: 338, tier: 'prime',   change: -1, badges: 2, p1: 155, p2: 120, p3: 63 , cohort: 'c2627' },
  { id: 'u16', name: 'Hadrien Solace',    track: 'AID', points: 312, tier: 'prime',   change: +2, badges: 2, p1: 148, p2: 108, p3: 56 , cohort: 'c2627' },
  { id: 'u17', name: 'Noor Bashir',       track: 'CC',  points: 298, tier: 'builder', change: +1, badges: 2, p1: 136, p2: 102, p3: 60 , cohort: 'c2627' },
  { id: 'u18', name: 'Cass Verwoerd',     track: 'VB',  points: 284, tier: 'builder', change: 0,  badges: 2, p1: 128, p2: 100, p3: 56 , cohort: 'c2627' },
  { id: 'u19', name: 'Oriana Bellucci',   track: 'XM',  points: 271, tier: 'builder', change: -2, badges: 1, p1: 120, p2: 96,  p3: 55, cohort: 'c2627' },
  { id: 'u20', name: 'Torin Macallister', track: 'POL', points: 258, tier: 'builder', change: +5, badges: 2, p1: 118, p2: 90,  p3: 50, cohort: 'c2627' },
  { id: 'u21', name: 'Elspeth Varga',     track: 'AIS', points: 244, tier: 'builder', change: +1, badges: 1, p1: 108, p2: 86,  p3: 50, cohort: 'c2627' },
  { id: 'u22', name: 'Kenji Balogun',     track: 'LD',  points: 231, tier: 'builder', change: 0,  badges: 1, p1: 100, p2: 84,  p3: 47, cohort: 'c2627' },
  { id: 'u23', name: 'Seren Aldaine',     track: 'CC',  points: 218, tier: 'builder', change: +2, badges: 1, p1: 98,  p2: 76,  p3: 44, cohort: 'c2627' },
  { id: 'u24', name: 'Rhea Pemberton',    track: 'AID', points: 202, tier: 'builder', change: -1, badges: 1, p1: 92,  p2: 68,  p3: 42, cohort: 'c2627' },
  { id: 'u25', name: 'Casimir Drosos',    track: 'VB',  points: 187, tier: 'builder', change: +3, badges: 1, p1: 86,  p2: 62,  p3: 39, cohort: 'c2627' },
  { id: 'u26', name: 'Ingrid Lundqvist',  track: 'POL', points: 172, tier: 'builder', change: 0,  badges: 1, p1: 78,  p2: 58,  p3: 36, cohort: 'c2627' },
  { id: 'u27', name: 'Solange Ngata',     track: 'XM',  points: 148, tier: 'builder', change: -4, badges: 0, p1: 68,  p2: 48,  p3: 32, cohort: 'c2627' },
  { id: 'u28', name: 'Tobi Ashworth',     track: 'AIS', points: 124, tier: 'builder', change: +1, badges: 0, p1: 58,  p2: 40,  p3: 26, cohort: 'c2627' },
  { id: 'u29', name: 'Halyard Beaumont',  track: 'LD',  points: 98,  tier: 'entry',   change: 0,  badges: 0, p1: 42,  p2: 36,  p3: 20, cohort: 'c2627' },
  { id: 'u30', name: 'Vivien Sorrento',   track: 'CC',  points: 76,  tier: 'entry',   change: -2, badges: 0, p1: 36,  p2: 24,  p3: 16, cohort: 'c2627' },
];

const ME_ID = 'u14';

// Missions for Maya — AIS track, Week 2 mid-flight
// Aligned to Exonaut Mission Briefs: Universal Wk1-2 (Pipeline, Discovery, Concept Paper)
// then Track 01 Week 3+ (AI Readiness Diagnostic, Landscape, Use Cases, Roadmap…)
const MISSIONS = [
  // ===== ACTIVE (Week 2, mid-flight) =====
  {
    id: 'EXO-MSN-ALL-2026-010',
    title: 'Concept Papers · 10 Prospects, 10 Papers',
    track: null, pillar: 'client', week: 2,
    points: 300, dueIn: 2, dueDate: 'OCT 23', dueTime: '23:59 SGT',
    status: 'in-progress',
    deliverable: 'document',
    description: `Write a <strong>1–2 page concept paper</strong> for <strong>EACH</strong> of your 10 prospects.\n\nProgress: <strong>6 of 10 drafted</strong>. Kestrel Biotics, Nuvo Genomics, Sereno Labs, Arc Mobility, Luzon Power, Paragon Retail. Four to go: Meridian Finance, Delta Logistics, Nexa Health, Ortus Insurance.\n\nEach paper must include:\n• Executive summary\n• Problem statement\n• Proposed solution\n• Scope\n• Timeline\n• Expected outcomes\n• Investment range\n\nAll 10 must be ML-approved before sending. <strong>+30 per paper</strong>, up to +20 Excellent bonus each.`,
    criteria: ['10 papers, 1 per prospect', 'All ML-approved before send', 'Tailored to each prospect’s pain point'],
  },
  {
    id: 'EXO-MSN-ALL-2026-011',
    title: 'Discovery Meetings · Book & Run — Target GREAT (4–6) or AWESOME (7+)',
    track: null, pillar: 'client', week: 2,
    points: 175, dueIn: 3, dueDate: 'OCT 24',
    status: 'in-progress',
    deliverable: 'document',
    description: `Book and run structured 30–45 min discovery sessions with as many of your 10 prospects as possible.\n\n<strong>Current: 2 meetings completed, 3 booked.</strong> One more confirmed meeting this week hits GOOD (+75). Four to six = GREAT (+150). Seven or more = AWESOME (+250) and unlocks an Intern of the Week nomination.\n\nBase: +25 per verified meeting. Outcome bonus stacks on top.`,
    criteria: ['Use the Exoasia Discovery Framework', 'Document pains, outcomes, decision process, budget signals', 'ML verifies each meeting'],
  },
  {
    id: 'EXO-MSN-ALL-2026-012',
    title: 'Friday Win Wall — Post Your Discovery Tier',
    track: null, pillar: 'project', week: 2,
    points: 5, dueIn: 3, dueDate: 'OCT 24', dueTime: '21:00 SGT',
    status: 'not-started',
    deliverable: 'link',
  },
  {
    id: 'EXO-MSN-AIS-2026-003',
    title: 'Mission 1 · AI Readiness Diagnostic (signed client)',
    track: 'AIS', pillar: 'project', week: 3,
    points: 30, dueIn: 9, dueDate: 'OCT 30', dueTime: '23:59 SGT',
    status: 'not-started',
    deliverable: 'document',
    description: `Administer the <strong>Exoasia AI Readiness Framework</strong> to whichever prospect signed your engagement letter / MOU. Interview 2–3 internal stakeholders.\n\nScore across <strong>6 dimensions</strong>:\n• Data Maturity\n• Process Automation Potential\n• AI Awareness\n• Leadership Buy-In\n• Technical Infrastructure\n• Budget Readiness\n\nGated on signed engagement letter / MOU from Week 2.`,
    criteria: ['All 6 dimensions scored with evidence', '2+ stakeholder interviews', 'Findings memo attached'],
  },

  // ===== APPROVED (earlier this cohort) =====
  {
    id: 'EXO-MSN-ALL-2026-009',
    title: 'First Discovery Meeting — Kestrel Biotics',
    track: null, pillar: 'client', week: 2,
    points: 25, dueIn: -3, dueDate: 'OCT 17',
    status: 'approved', grade: 'excellent', pointsAwarded: 45,
    deliverable: 'document',
    feedback: 'Sharp questions. Kestrel flagged your client-centric tone in our debrief. +20 excellent bonus. This is meeting 1 of your discovery tier run — keep booking.',
  },
  {
    id: 'EXO-MSN-ALL-2026-008',
    title: 'Prospecting — 10 Qualified Prospects',
    track: null, pillar: 'client', week: 1,
    points: 20, dueIn: -6, dueDate: 'OCT 14',
    status: 'approved', grade: 'excellent', pointsAwarded: 40,
    deliverable: 'document',
    feedback: '11 prospects — named contacts, specific pain points. Kestrel, Nuvo Genomics, and Sereno Labs are the three to prioritize for papers. Excellent.',
  },
  {
    id: 'EXO-MSN-ALL-2026-001',
    title: 'Exonaut Pledge & LinkedIn Announcement',
    track: null, pillar: 'project', week: 1,
    points: 70, dueIn: -10, dueDate: 'OCT 10',
    status: 'approved', grade: 'good', pointsAwarded: 70,
    deliverable: 'link',
  },
  {
    id: 'EXO-MSN-ALL-2026-002',
    title: 'Platform Onboarding & Track Confirmation',
    track: null, pillar: 'project', week: 1,
    points: 10, dueIn: -10, dueDate: 'OCT 10',
    status: 'approved', grade: 'good', pointsAwarded: 10,
    deliverable: 'document',
  },

  // ===== LOOKING AHEAD =====
  {
    id: 'EXO-MSN-ALL-2026-013',
    title: 'Recruit Scout — Submit First Candidate',
    track: null, pillar: 'recruitment', week: 7,
    points: 30, dueIn: 35, dueDate: 'DEC 01',
    status: 'not-started',
    deliverable: 'link',
  },
];

// Rituals for current week
const RITUALS = [
  { id: 'mon-ign',  name: 'Monday Ignition', points: 5,  state: 'done'    },
  { id: 'mid-pls',  name: 'Mid-Week Pulse',  points: 3,  state: 'done'    },
  { id: 'fri-win',  name: 'Friday Win Wall', points: 5,  state: 'pending' },
  { id: 'iotw',     name: 'Intern of Week',  points: 25, state: 'missed'  },
  { id: 'teach-bk', name: 'Teach-Back',      points: 15, state: 'pending' },
];

const BADGES = [
  // Milestone
  { code: 'MIL-BRZ', name: 'Bronze Builder',   subtitle: '100 points',  category: 'milestone', color: '#CD7F32', earned: true,  date: 'OCT 14 2026' },
  { code: 'MIL-SLV', name: 'Silver Strategist', subtitle: '300 points', category: 'milestone', color: '#A8B4BE', earned: true,  date: 'OCT 19 2026' },
  { code: 'MIL-GLD', name: 'Gold Innovator',    subtitle: '600 points', category: 'milestone', color: '#C9A000', earned: false },
  { code: 'MIL-PLT', name: 'Platinum Disruptor',subtitle: '900 points', category: 'milestone', color: '#7FE3FF', earned: false },
  // Track (only the user's own track shown earned-possible)
  { code: 'TRK-AIS', name: 'AI Strategist',    subtitle: 'AI Strategy track', category: 'track', color: '#C9F24A', earned: false },
  { code: 'TRK-VB',  name: 'Venture Builder',  subtitle: 'Venture track',     category: 'track', color: '#B14CFF', earned: false },
  { code: 'TRK-LD',  name: 'L&D Champion',     subtitle: 'L&D track',         category: 'track', color: '#C6B8FF', earned: false },
  { code: 'TRK-XM',  name: 'Experience Maker', subtitle: 'Experience track', category: 'track', color: '#F59E0B', earned: false },
  { code: 'TRK-AID', name: 'AI Dev Builder',   subtitle: 'AI Dev track',      category: 'track', color: '#8BE8FF', earned: false },
  { code: 'TRK-POL', name: 'Policy Analyst',   subtitle: 'Policy track',      category: 'track', color: '#CD7F32', earned: false },
  { code: 'TRK-CC',  name: 'Content Creator',  subtitle: 'Content track',     category: 'track', color: '#3DDC84', earned: false },
  // Pillar
  { code: 'PIL-DLV', name: 'Delivery Machine', subtitle: 'Max Project score', category: 'pillar', color: '#C9F24A', earned: false },
  { code: 'PIL-INN', name: 'Innovation Catalyst', subtitle: 'Breakthrough work', category: 'pillar', color: '#B14CFF', earned: false },
  { code: 'PIL-CLT', name: 'Client Champion',  subtitle: 'Max Client score',  category: 'pillar', color: '#7FE3FF', earned: false },
  { code: 'PIL-TAL', name: 'Talent Scout',     subtitle: 'Max Recruit score', category: 'pillar', color: '#B095C5', earned: false },
  // Special
  { code: 'SPL-TRI', name: 'Perfect Trifecta', subtitle: 'All three pillars maxed', category: 'special', color: '#F4C542', earned: false },
  { code: 'SPL-MVP', name: 'Track MVP',        subtitle: 'Top of your track',  category: 'special', color: '#C9F24A', earned: false },
  { code: 'SPL-IOW', name: 'Intern of Week',   subtitle: 'Weekly award',      category: 'special', color: '#FFB020', earned: true, date: 'OCT 11 2026' },
  { code: 'SPL-DIS', name: 'Most Likely to Disrupt', subtitle: 'Program-end award', category: 'special', color: '#FF5B5B', earned: false },
  { code: 'SPL-CLT', name: 'Culture Carrier',  subtitle: 'Most kudos received', category: 'special', color: '#B095C5', earned: false },
  { code: 'SPL-FUL', name: 'Full Cycle',       subtitle: 'All rituals attended', category: 'special', color: '#22C55E', earned: false },
  { code: 'SPL-PIP', name: 'Pipeline Builder', subtitle: '3+ recruits placed', category: 'special', color: '#8BE8FF', earned: false },
];

const ACTIVITY = [
  { type: 'badge',    body: 'Earned <span class="emph">SILVER STRATEGIST</span> badge', time: '2h ago', icon: 'fa-medal' },
  { type: 'kudos',    body: '<span class="emph">Priya</span> gave you kudos', sub: '"Your Kestrel discovery notes were absurdly clean — I stole your framing."', time: '4h ago', icon: 'fa-hand-sparkles' },
  { type: 'rank',     body: 'Rank moved <span class="emph">#17 → #14</span>', time: '8h ago', icon: 'fa-arrow-trend-up' },
  { type: 'points',   body: '<span class="emph">+45 pts</span> · Discovery Session approved EXCELLENT', sub: 'Kestrel Biotics — 60-min discovery call', time: 'Yesterday', icon: 'fa-bolt' },
  { type: 'announce', body: 'Mack posted: <span class="emph">Midpoint Fire Check scheduled</span>', time: 'Yesterday', icon: 'fa-bullhorn' },
  { type: 'kudos',    body: '<span class="emph">Theo</span> gave you kudos', sub: '"You shared your pipeline sheet as a template — huge time-saver."', time: '2d ago', icon: 'fa-hand-sparkles' },
  { type: 'badge',    body: 'Earned <span class="emph">BRONZE BUILDER</span> badge', time: '6d ago', icon: 'fa-medal' },
  { type: 'points',   body: '<span class="emph">+40 pts</span> · Customer Pipeline approved', time: '6d ago', icon: 'fa-bolt' },
];

const ME = USERS.find(u => u.id === ME_ID);
const ME_RANK = USERS.sort((a,b) => b.points - a.points).findIndex(u => u.id === ME_ID) + 1;

// ==== ORG HIERARCHY ====
// Director (Mission Commander) → Managers (Mission Leads, 1 per track) → Interns (Exonauts)
const COMMANDER = {
  id: 'cmdr-01', name: 'Mack Comandante', role: 'director',
  title: 'Mission Commander · Founder',
  yearsAtExoasia: 4, cohortsRun: 3,
};

const LEADS = [
  { id: 'lead-ais', name: 'Dr. Nadia Oyelaran',  role: 'manager', track: 'AIS', reports: ['u02','u05','u13','u14','u21','u28'], reviewQueue: 4, avgSubmitRate: 92, satisfaction: 4.7 },
  { id: 'lead-vb',  name: 'Kofi Ansong',         role: 'manager', track: 'VB',  reports: ['u03','u10','u18','u25'], reviewQueue: 2, avgSubmitRate: 88, satisfaction: 4.5 },
  { id: 'lead-ld',  name: 'Saoirse Flanagan',    role: 'manager', track: 'LD',  reports: ['u07','u15','u22','u29'], reviewQueue: 3, avgSubmitRate: 80, satisfaction: 4.2 },
  { id: 'lead-xm',  name: 'Rin Tachibana',       role: 'manager', track: 'XM',  reports: ['u06','u12','u19','u27'], reviewQueue: 1, avgSubmitRate: 94, satisfaction: 4.8 },
  { id: 'lead-aid', name: 'Anders Vogt',         role: 'manager', track: 'AID', reports: ['u01','u09','u16','u24'], reviewQueue: 5, avgSubmitRate: 96, satisfaction: 4.9 },
  { id: 'lead-pol', name: 'Mariela Escárcega',   role: 'manager', track: 'POL', reports: ['u04','u11','u20','u26'], reviewQueue: 2, avgSubmitRate: 85, satisfaction: 4.4 },
  { id: 'lead-cc',  name: 'Beatrix Hollander',   role: 'manager', track: 'CC',  reports: ['u08','u17','u23','u30'], reviewQueue: 6, avgSubmitRate: 72, satisfaction: 3.9 },
];

// Pending submissions awaiting grade (lead view)
const PENDING_SUBS = [
  { id: 'sub-01', missionId: 'EXO-MSN-AIS-2026-003', missionTitle: 'Competitive Landscape Analysis', exonautId: 'u02', submittedAt: '2h ago', deliverable: 'document', wordCount: 2140, isLate: false },
  { id: 'sub-02', missionId: 'EXO-MSN-AIS-2026-003', missionTitle: 'Competitive Landscape Analysis', exonautId: 'u05', submittedAt: '5h ago', deliverable: 'document', wordCount: 2380, isLate: false },
  { id: 'sub-03', missionId: 'EXO-MSN-AIS-2026-003', missionTitle: 'Competitive Landscape Analysis', exonautId: 'u13', submittedAt: '14h ago', deliverable: 'document', wordCount: 1620, isLate: false },
  { id: 'sub-04', missionId: 'EXO-MSN-AIS-2026-002', missionTitle: 'Client Discovery', exonautId: 'u21', submittedAt: '1d ago', deliverable: 'document', wordCount: 890, isLate: true },
];

// Pending directives issued BY leads TO exonauts, awaiting acceptance
const DIRECTIVES = [
  {
    id: 'DIR-AIS-2026-007',
    from: 'lead-ais', to: 'u14',
    title: 'Kestrel Series A Pitch Memo — Draft by Friday',
    brief: 'Mack is briefing Kestrel\'s board Monday. Draft a 3-page strategic memo framing our positioning thesis. Lean on your competitive landscape work. I trust your instincts — if you disagree with the thesis, say so in the memo.',
    pillar: 'project', points: 35, dueDate: 'OCT 24', dueTime: '17:00 SGT',
    deliverable: 'document',
    issuedAt: '1h ago',
    status: 'pending', // pending | accepted | clarification
  },
];

const ESCALATIONS = [
  { id: 'esc-01', type: 'at-risk', severity: 'high',   body: 'Vivien Sorrento (u30) — no submissions in 8 days. Last ritual miss: 3. Flag for Fire Check.',    leadId: 'lead-cc',  time: '2h ago' },
  { id: 'esc-02', type: 'client',  severity: 'med',    body: 'Kestrel Biotics requested time with Nadia (AIS lead) re: deliverable cadence. Non-blocking.',    leadId: 'lead-ais', time: 'Yesterday' },
  { id: 'esc-03', type: 'grading', severity: 'med',    body: 'CC track grading queue stale — 6 subs waiting >48h. SLA breached.',                                leadId: 'lead-cc',  time: 'Yesterday' },
  { id: 'esc-04', type: 'conflict',severity: 'low',    body: 'Theo (u06) requested mentor change. Culture carrier, low risk. Rin has context.',                 leadId: 'lead-xm',  time: '3d ago' },
];

const ROLE_IDENTITIES = {
  exonaut:   { id: ME_ID,          name: ME.name,             role: 'intern',    label: 'Exonaut',          home: 'dashboard' },
  lead:      { id: 'lead-ais',     name: 'Dr. Nadia Oyelaran',role: 'manager',   label: 'Mission Lead',     home: 'lead-home',    track: 'AIS' },
  commander: { id: 'cmdr-01',      name: 'Mack Comandante',   role: 'director',  label: 'Mission Commander',home: 'cmdr-home' },
};

// ==== POINTS RUBRIC (from Exonaut Mission Briefs) ====
const POINTS_RUBRIC = [
  { group: 'Onboarding',       label: 'Pledge signed (Day 1)',                pts: '+50', note: 'One-time onboarding bonus' },
  { group: 'Onboarding',       label: 'LinkedIn post published',              pts: '+20', note: 'Verified by link' },
  { group: 'Mission submission', label: 'Mission submitted on time',           pts: '+10 to +50', note: 'Set per mission by ML' },
  { group: 'Mission submission', label: 'Mission graded Good',                 pts: '+10', note: 'Bonus on top' },
  { group: 'Mission submission', label: 'Mission graded Excellent',            pts: '+20', note: 'Bonus on top' },
  { group: 'Client',           label: 'Prospect pipeline (10 qualified)',    pts: '+20', note: 'Wk 1 · in CRM' },
  { group: 'Client',           label: 'Concept paper submitted (per paper)', pts: '+30', note: 'Wk 2 · 1 per prospect · 10 total' },
  { group: 'Client',           label: 'Discovery meeting completed',          pts: '+25', note: 'Per verified meeting' },
  { group: 'Client',           label: 'Discovery tier · GOOD (3 meetings)',   pts: '+75', note: 'Week 2 outcome bonus' },
  { group: 'Client',           label: 'Discovery tier · GREAT (4–6 meetings)',pts: '+150',note: 'Week 2 outcome bonus' },
  { group: 'Client',           label: 'Discovery tier · AWESOME (7+ meetings)',pts: '+250',note: 'Week 2 outcome bonus · IOW nom' },
  { group: 'Client',           label: 'Client signs engagement / MOU',        pts: '+50', note: 'Pipeline Bonus · stackable' },
  { group: 'Client',           label: 'Client touchpoint logged',             pts: '+15', note: 'Per verified touchpoint' },
  { group: 'Client',           label: 'Client 4-star satisfaction',           pts: '+20', note: 'Awarded by ML' },
  { group: 'Client',           label: 'Client 5-star satisfaction',           pts: '+35', note: 'Awarded by ML' },
  { group: 'Client',           label: 'Client deliverable accepted',          pts: '+25', note: 'Per accepted' },
  { group: 'Recruitment',      label: 'Recruit candidate submitted',          pts: '+30', note: 'Name + contact' },
  { group: 'Recruitment',      label: 'Recruit accepts offer',                pts: '+50', note: 'Placement confirmed' },
  { group: 'Rituals',          label: 'Attend Monday Ignition',               pts: '+5',  note: 'Per session' },
  { group: 'Rituals',          label: 'Post Mid-Week Pulse',                  pts: '+3',  note: 'Per week' },
  { group: 'Rituals',          label: 'Post Friday Win Wall',                 pts: '+5',  note: 'Per week' },
  { group: 'Culture',          label: 'Give peer kudos',                      pts: '+2',  note: 'Max 3/week' },
  { group: 'Culture',          label: 'Receive peer kudos',                   pts: '+3',  note: 'Uncapped' },
  { group: 'Culture',          label: 'Teach-Back session conducted',         pts: '+15', note: 'Verified by ML' },
  { group: 'Milestones',       label: 'Intern of the Week win',               pts: '+25', note: 'Weekly award' },
  { group: 'Milestones',       label: 'Midpoint Fire Check completed',        pts: '+10', note: 'Week 6 1:1' },
  { group: 'Milestones',       label: 'Demo Day presentation',                pts: '+50', note: 'All presenters' },
];

// ==== UNIVERSAL WEEK 1 & 2 (applies to all tracks) ====
// Flow: 10 prospects → 10 concept papers (1 per prospect) → discovery meetings.
const PROSPECTS = [
  {
    id: 'P01', company: 'Kestrel Biotics', status: 'paper-drafted', paperStatus: 'ML Review',
    contact: 'Dr. Ana Reyes', position: 'Head of R&D Operations',
    linkedin: 'linkedin.com/in/anareyes', email: 'a.reyes@kestrelbio.com', mobile: '+65 9128 4410',
    industry: 'Biotech · Diagnostics',
    pains: [
      'Lab data siloed across 4 LIMS — weekly reports take 2 FTEs',
      'No structured AI strategy; CTO under board pressure Q2',
      'Audit prep is manual — 6-week lag from query to response',
    ],
    deliverable: 'AI Readiness Assessment + Data Integration Roadmap',
    nextStep: 'Concept paper in ML review, send Wed',
    notes: 'First discovery meeting logged as Excellent. Ana flagged client-centric tone. Likely signs MOU if scope stays under $45K.',
    meetingStatus: 'completed', investmentRange: '$35–45K',
  },
  {
    id: 'P02', company: 'Nuvo Genomics', status: 'paper-drafted', paperStatus: 'Drafted',
    contact: 'Marcus Tan', position: 'VP, Commercial Ops',
    linkedin: 'linkedin.com/in/marcustan-nuvo', email: 'm.tan@nuvogenomics.sg', mobile: '+65 8844 2217',
    industry: 'Genomics · Consumer Health',
    pains: [
      'Customer report generation 80% manual; scaling blocked',
      'No segmentation on 40K customer base — flat marketing perf',
      'Considering in-house AI team — wants external POV first',
    ],
    deliverable: 'AI Readiness Assessment + GenAI report-automation POC',
    nextStep: 'Send concept paper Thu, push for meeting next wk',
    notes: 'Cold intro via LinkedIn. Marcus replied in 3hrs. Strong buying signals.',
    meetingStatus: 'booked', investmentRange: '$40–55K',
  },
  {
    id: 'P03', company: 'Sereno Labs', status: 'paper-drafted', paperStatus: 'Drafted',
    contact: 'Priya Iyer', position: 'Chief of Staff',
    linkedin: 'linkedin.com/in/priya-iyer-sereno', email: 'priya@serenolabs.io', mobile: '+65 9771 0382',
    industry: 'Mental Health · Telehealth',
    pains: [
      'Therapist-patient matching manual — 18% dropoff',
      'Session notes unstructured — no outcome tracking',
      'Privacy / PDPA concerns blocking AI vendor adoption',
    ],
    deliverable: 'AI Readiness + Privacy-Safe Matching Algorithm Spec',
    nextStep: 'ML feedback on paper, revise Thu AM',
    notes: 'Priya is the decision-maker. Budget exists. Privacy angle is the wedge.',
    meetingStatus: 'booked', investmentRange: '$30–40K',
  },
  {
    id: 'P04', company: 'Arc Mobility', status: 'paper-drafted', paperStatus: 'Drafted',
    contact: 'Jae-Won Park', position: 'Director of Operations',
    linkedin: 'linkedin.com/in/jaewonpark', email: 'jw.park@arcmobility.com', mobile: '+65 9033 8814',
    industry: 'Logistics · Last-Mile',
    pains: [
      'Fleet routing in spreadsheets — 15% empty-miles',
      'No predictive maintenance — ~8% unplanned downtime/quarter',
      'Board asking for "AI story" for Series B in Q2',
    ],
    deliverable: 'AI Readiness + Route-Optimization Pilot Proposal',
    nextStep: 'Send paper Wed, target meeting Fri',
    notes: 'Jae-Won introduced via Mack. Warm. Series-B narrative is the trigger.',
    meetingStatus: 'booked', investmentRange: '$50–70K',
  },
  {
    id: 'P05', company: 'Luzon Power', status: 'paper-drafted', paperStatus: 'Drafted',
    contact: 'Elena Villanueva', position: 'Head of Digital Transformation',
    linkedin: 'linkedin.com/in/elenavillanueva', email: 'e.villanueva@luzonpower.ph', mobile: '+63 917 882 4401',
    industry: 'Energy · Utilities',
    pains: [
      'Grid anomaly detection still rule-based — misses events monthly',
      'Customer complaint triage — 72hr avg, target 12hr',
      'Wants partnership not replacement for small DS team',
    ],
    deliverable: 'AI Readiness + Anomaly Detection Roadmap',
    nextStep: 'Send paper Thu; expect slow reply cycle',
    notes: 'Elena cautious but engaged. Budget cycle starts Feb. Long play.',
    meetingStatus: 'pending', investmentRange: '$45–65K',
  },
  {
    id: 'P06', company: 'Paragon Retail', status: 'paper-drafted', paperStatus: 'Drafted',
    contact: 'Hiroshi Nakamura', position: 'VP, eCommerce',
    linkedin: 'linkedin.com/in/hnakamura-paragon', email: 'h.nakamura@paragonretail.com', mobile: '+65 8298 1145',
    industry: 'Retail · Omnichannel',
    pains: [
      'Catalog enrichment — 200+ SKUs/wk manual work',
      'Site personalization generic — 3.1% conv vs 5% target',
      'CEO mandate: ship 2 GenAI wins by EOY',
    ],
    deliverable: 'AI Readiness + Catalog-Enrichment GenAI POC',
    nextStep: 'Send paper Wed, Hiroshi replies same-day',
    notes: 'CEO mandate is the real buyer. Hiroshi is champion. Fast decision likely.',
    meetingStatus: 'pending', investmentRange: '$40–60K',
  },
  {
    id: 'P07', company: 'Meridian Finance', status: 'paper-pending',
    contact: 'Samira Khan', position: 'Head of Data Platforms',
    linkedin: 'linkedin.com/in/samira-khan-meridian', email: 's.khan@meridianfin.sg', mobile: '+65 9182 4467',
    industry: 'Financial Services · Wealth',
    pains: [
      'Client onboarding KYC — 9 day avg, regulatory risk',
      'Portfolio reporting manual; audit-flagged twice in 2025',
      'Board pushing AI but compliance is the gate',
    ],
    deliverable: 'AI Readiness + Compliance-First Onboarding Automation Spec',
    nextStep: 'Draft paper Tue',
    notes: 'Compliance-heavy. Lead with risk framing, not capability.',
    meetingStatus: 'none', investmentRange: '$55–80K',
  },
  {
    id: 'P08', company: 'Delta Logistics', status: 'paper-pending',
    contact: 'Rafael Bautista', position: 'COO',
    linkedin: 'linkedin.com/in/rafaelbautista', email: 'raf@deltalogistics.ph', mobile: '+63 917 442 8890',
    industry: 'Logistics · Freight Forwarding',
    pains: [
      'Cross-border docs processing — 6–12hr per shipment',
      'No forecasting on container demand — constant overbooking',
      'Thin margins — every hour saved is direct P&L',
    ],
    deliverable: 'AI Readiness + Doc-Intelligence Pilot Proposal',
    nextStep: 'Draft paper Tue PM',
    notes: 'Raf is ex-banker, fluent in ROI language. Lead w/ P&L math.',
    meetingStatus: 'none', investmentRange: '$40–60K',
  },
  {
    id: 'P09', company: 'Nexa Health', status: 'paper-pending',
    contact: 'Dr. Kenji Sato', position: 'Chief Medical Officer',
    linkedin: 'linkedin.com/in/kenjisato-nexa', email: 'k.sato@nexahealth.com', mobile: '+65 9334 8821',
    industry: 'Health-tech · Hospital SaaS',
    pains: [
      'Clinical note summarization requested by 3 hospital clients',
      'HL7 / FHIR integration complexity blocking workflow fit',
      'No internal AI/ML headcount; API spend approved',
    ],
    deliverable: 'AI Readiness + Clinical-Summary GenAI Scoping',
    nextStep: 'Draft paper Wed',
    notes: 'Kenji is clinician, not tech. Keep paper outcome-framed.',
    meetingStatus: 'none', investmentRange: '$50–75K',
  },
  {
    id: 'P10', company: 'Ortus Insurance', status: 'paper-pending',
    contact: 'Adaeze Okonkwo', position: 'Head of Claims Innovation',
    linkedin: 'linkedin.com/in/adaeze-okonkwo', email: 'a.okonkwo@ortusinsure.com', mobile: '+65 9771 2240',
    industry: 'Insurance · Claims',
    pains: [
      'Claims triage manual; 4-day SLA missed ~20% of time',
      'Fraud detection rule-based — false positives eating team hours',
      'CEO wants "AI-native" narrative for 2026 investor day',
    ],
    deliverable: 'AI Readiness + Claims-Triage Automation Proposal',
    nextStep: 'Draft paper Thu (last of 10)',
    notes: 'Adaeze is a connector — if she likes it, she forwards to CFO + Chief Claims.',
    meetingStatus: 'none', investmentRange: '$60–90K',
  },
];

const DISCOVERY_TIERS = [
  { tier: 'GOOD',    minMeetings: 3, maxMeetings: 3,  pts: 75,  color: '#CD7F32', note: 'Baseline — hit the floor' },
  { tier: 'GREAT',   minMeetings: 4, maxMeetings: 6,  pts: 150, color: '#A8B4BE', note: 'Strong week — most Exonauts target this' },
  { tier: 'AWESOME', minMeetings: 7, maxMeetings: null,pts: 250, color: '#C9A000', note: 'Top performers — unlocks Intern of the Week nomination' },
];

const UNIVERSAL_WEEKS = [
  {
    week: 1, title: 'Prospecting · Build Your Client Pipeline',
    ptsRange: '70–90',
    badgeEligible: null,
    rituals: ['Monday Ignition (Mon 9AM)', 'Mid-Week Pulse (Wed noon)', 'Friday Win Wall (Fri 5PM)', 'Pledge Signing Ceremony (Day 1)'],
    missions: [
      { n: 1, pts: 50, text: 'Pledge Signing Ceremony — attend Day 1, sign the Pledge, post group photo.' },
      { n: 2, pts: 10, text: 'Complete platform onboarding wizard — photo, bio, track, client.' },
      { n: 3, pts: 20, text: 'Post LinkedIn announcement within 48 hours using the approved template.' },
      { n: 4, pts: '20+20', text: 'Prospecting Mission — identify and qualify 10 prospects relevant to your track. For each, document: company, industry, size, key contact + LinkedIn, pain point, proposed service hook. Log all in the Game Changer Funnel CRM.' },
      { n: 5, pts: 5, text: 'Attend Monday Ignition — post your Week 1 goal.' },
      { n: 6, pts: 3, text: 'Post Mid-Week Pulse on Wednesday.' },
      { n: 7, pts: 5, text: 'Post Friday Win Wall — your #1 win from Week 1.' },
    ],
  },
  {
    week: 2, title: 'Concept Papers · 10 Prospects, 10 Papers',
    ptsRange: '120–180 (+50 Pipeline Bonus per client signed)',
    badgeEligible: 'Bronze Builder (100 pts)',
    rituals: ['Monday Ignition', 'Mid-Week Pulse', 'Friday Win Wall', 'Discovery calls with prospects'],
    missions: [
      { n: 8,  pts: '10 × 30', text: '10 Concept Papers — write a 1–2 page concept paper for EACH of your 10 prospects. Each must include: exec summary, problem statement, proposed solution, scope, timeline, expected outcomes, investment range. All 10 must be ML-approved before sending. (+30 per paper, up to +20 Excellent bonus each)' },
      { n: 9,  pts: '—',   text: 'Send concept papers to all 10 prospects and request a Discovery Meeting with each.' },
      { n: 10, pts: '25 × N', text: 'Discovery Meetings — conduct structured 30–45 min discovery sessions. +25 per verified meeting. Outcome tiers scored on total meetings booked: 3 = GOOD (+75), 4–6 = GREAT (+150), 7+ = AWESOME (+250).' },
      { n: 11, pts: '+50 each', text: 'Client Sign-Off — any prospect that signs an engagement letter / MOU earns the Pipeline Bonus. Stack these — multiple signs, multiple bonuses.' },
      { n: 12, pts: 3, text: 'Mid-Week Pulse — track your meeting count toward tier.' },
      { n: 13, pts: 5, text: 'Friday Win Wall — share your tier hit (GOOD / GREAT / AWESOME).' },
      { n: 14, pts: 5, text: 'Attend Monday Ignition.' },
    ],
  },
];

// ==== TRACK-SPECIFIC BRIEFS · Weeks 3-12 (condensed from PDF) ====
const TRACK_BRIEFS = {
  AIS: [
    { week: 3,  title: 'AI Readiness Assessment — Phase 1', ptsRange: '80–120', badgeEligible: 'Silver targeting Wk 5',
      missions: ['Client Sign-Off — engagement letter / MOU signed (+50 Pipeline Bonus)',
                 'Mission 1 · AI Readiness Diagnostic — Exoasia AI Readiness Framework across 6 dimensions: Data Maturity, Process Automation, AI Awareness, Leadership Buy-In, Technical Infra, Budget Readiness (+30, +20 bonus)'] },
    { week: 4,  title: 'Competitive & Landscape Analysis', ptsRange: '60–90',
      missions: ['Mission 2 · Industry AI Landscape Report — 4–6 pages on AI adoption trends, use cases, competitive intel for client\'s industry. 5+ real case studies (+35, +20)',
                 'Log client touchpoint with preliminary findings (+15)'] },
    { week: 5,  title: 'AI Use Case Prioritization', ptsRange: '65–95', badgeEligible: 'Silver Builder (300 pts)',
      missions: ['Mission 3 · Use Case Identification & Prioritization Matrix — 6–10 AI use cases scored on Business Impact, Feasibility, Data Availability, ROI. 2×2 matrix with top 3 (+35, +20)',
                 'Teach-Back Session — teach cohort one framework from your AI strategy work (+15)'] },
    { week: 6,  title: 'Midpoint Fire Check + Strategic Roadmap Draft', ptsRange: '55–85',
      missions: ['Midpoint Fire Check — 30-min 1:1 with ML (+10)',
                 'Mission 4 · AI Strategic Roadmap Draft — 3-year transformation roadmap: vision, 3 priorities, 90-day wins, 12-month milestones, 3-year goals, resources, risks (+40, +20)'] },
    { week: 7,  title: 'Client Roadmap Presentation Prep + Recruit', ptsRange: '70–100', badgeEligible: 'Gold Innovator (600 pts)',
      missions: ['Mission 5 · Client Roadmap Presentation — 10–15 slide board-ready PPT, client-branded (+40, +20)',
                 'Recruit Scout — submit 1 candidate for next cohort (+30)'] },
    { week: 8,  title: 'Client Presentation Delivery', ptsRange: '65–95',
      missions: ['Mission 6 · Present AI Strategic Roadmap to client — submit recording/notes, reactions, 1-page action memo (+40, +20 if next phase agreed)',
                 'Client Deliverable Accepted (+25)'] },
    { week: 9,  title: 'Capstone Scoped — AI Business Case', ptsRange: '60–90',
      missions: ['Mission 7 · AI Transformation Business Case — investment-grade: exec summary, problem, proposed solution, implementation plan, cost-benefit, risks, ROI projection (+50, +20)'] },
    { week: 10, title: 'Capstone Build + Recruit Follow-up', ptsRange: '65–95', badgeEligible: 'Platinum Disruptor (900 pts)',
      missions: ['Capstone build sessions — refine business case with ML feedback', 'Recruit follow-up (+15 per touchpoint)'] },
    { week: 11, title: 'Capstone Final + Peer Vote', ptsRange: '50–80',
      missions: ['Finalize business case for Demo Day', 'Peer voting opens'] },
    { week: 12, title: 'Demo Day + Corps Induction', ptsRange: '60–80',
      missions: ['Demo Day · 8-min presentation: discovery → roadmap → business case (+50)', 'Exonaut Corps induction'] },
  ],
  VB: [
    { week: 3, title: 'Venture Sign + EBELI Baseline', ptsRange: '85–125', missions: ['Client Sign-Off (+50 Pipeline Bonus)', 'Mission 1 · EBELI Baseline Assessment — 5 dimensions: Problem Clarity, Solution Differentiation, Market Opportunity, Team Readiness, Business Model Viability (+35, +20)'] },
    { week: 4, title: 'TRL Assessment + Problem-Solution Fit', ptsRange: '60–90', missions: ['Mission 2 · TRL Assessment — evaluate client AI tech on 9-level scale, gap to TRL 6, dev milestones (+35, +20)', 'Log client touchpoint (+15)'] },
    { week: 5, title: 'Business Model Canvas + GTM', ptsRange: '65–95', missions: ['Mission 3 · AI-Native Business Model Canvas — with AI overlay on value props, cost, moats (+35, +20)', 'Teach-Back Session (+15)'] },
    { week: 6, title: 'Midpoint Fire Check + Financial Model', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · 3-Year Financial Model — P&L, revenue, costs, funding, unit economics, bear/base/bull (+40, +20)'] },
    { week: 7, title: 'Investor Pitch Deck + Recruit', ptsRange: '70–100', missions: ['Mission 5 · Investor Pitch Deck — 12–15 slides, Kawasaki structure, client-branded (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Pitch Rehearsal + Feedback Integration', ptsRange: '65–95', missions: ['Mission 6 · Pitch Dry Run with founder — revise 3 slides, submit updated deck + revision notes (+35, +20)'] },
    { week: 9, title: 'Capstone — Venture Investment Dossier', ptsRange: '65–95', missions: ['Mission 7 · Full investment-ready dossier: EBELI + TRL + BMC + Financials + Deck + 1-pg Investment Thesis (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Dossier refinement'] },
    { week: 11, title: 'Peer Vote + Finalize', ptsRange: '50–80', missions: ['Finalize dossier'] },
    { week: 12, title: 'Demo Day + Corps Induction', ptsRange: '60–80', missions: ['Demo Day · 8-min pitch of venture-building journey (+50)', 'Corps induction'] },
  ],
  LD: [
    { week: 3, title: 'Client Sign + L&D Needs Assessment', ptsRange: '85–125', missions: ['Client Sign-Off (+50)', 'Mission 1 · L&D Needs Assessment — stakeholder interviews, skills gap analysis, learner personas (+35, +20)'] },
    { week: 4, title: 'Learning Architecture + Curriculum Outline', ptsRange: '60–90', missions: ['Mission 2 · Learning Architecture — modality mix, competency map, 8-week curriculum outline (+35, +20)'] },
    { week: 5, title: 'Module 1 Build + Facilitator Guide', ptsRange: '65–95', missions: ['Mission 3 · First Module Build — slides, activities, facilitator guide, handouts (+35, +20)', 'Teach-Back (+15)'] },
    { week: 6, title: 'Midpoint + Pilot Prep', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · Pilot Workshop Plan — run-of-show, participant workbook, assessment instrument (+40, +20)'] },
    { week: 7, title: 'Live Pilot Workshop + Recruit', ptsRange: '70–100', missions: ['Mission 5 · Deliver Live Pilot Workshop to client cohort — submit recording + feedback scores (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Iteration + Modules 2-4', ptsRange: '65–95', missions: ['Mission 6 · Iterate based on pilot + build Modules 2–4 (+40, +20)'] },
    { week: 9, title: 'Capstone — Full Curriculum Package', ptsRange: '65–95', missions: ['Mission 7 · Complete curriculum: all modules, facilitator guides, LMS-ready assets, evaluation framework (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Package refinement'] },
    { week: 11, title: 'Peer Vote', ptsRange: '50–80', missions: ['Finalize'] },
    { week: 12, title: 'Demo Day', ptsRange: '60–80', missions: ['Demo Day · 8 min (+50)', 'Corps induction'] },
  ],
  XM: [
    { week: 3, title: 'Client Sign + Event Discovery', ptsRange: '85–125', missions: ['Client Sign-Off (+50)', 'Mission 1 · Event Strategy Brief — objective, audience, success metrics, concept direction (+35, +20)'] },
    { week: 4, title: 'Creative Concept + Experience Map', ptsRange: '60–90', missions: ['Mission 2 · Creative Concept + Experience Map — full journey from invite to post-event (+35, +20)'] },
    { week: 5, title: 'Production Plan + Run-of-Show', ptsRange: '65–95', missions: ['Mission 3 · Production Plan — vendors, budget, run-of-show, tech rider (+35, +20)', 'Teach-Back (+15)'] },
    { week: 6, title: 'Midpoint + Content & Comms', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · Content & Comms Package — invitations, signage, scripts, social assets (+40, +20)'] },
    { week: 7, title: 'Dry Run + Recruit', ptsRange: '70–100', missions: ['Mission 5 · Full Dry Run with client — submit recording + revision log (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Live Event Delivery', ptsRange: '65–95', missions: ['Mission 6 · Execute Live Event — submit attendance, photos, client sign-off (+40, +20)'] },
    { week: 9, title: 'Capstone — Event Impact Report', ptsRange: '65–95', missions: ['Mission 7 · Full Impact Report: attendance, NPS, media, ROI, highlight reel (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Report refinement'] },
    { week: 11, title: 'Peer Vote', ptsRange: '50–80', missions: ['Finalize'] },
    { week: 12, title: 'Demo Day', ptsRange: '60–80', missions: ['Demo Day · 8 min (+50)', 'Corps induction'] },
  ],
  AID: [
    { week: 3, title: 'Client Sign + Product Spec', ptsRange: '85–125', missions: ['Client Sign-Off (+50)', 'Mission 1 · Product Spec + User Stories — problem, users, core flows, acceptance criteria (+35, +20)'] },
    { week: 4, title: 'Architecture + Model Selection', ptsRange: '60–90', missions: ['Mission 2 · Technical Architecture — stack, AI models, data flow, eval plan (+35, +20)'] },
    { week: 5, title: 'MVP Prototype · v0.1', ptsRange: '65–95', missions: ['Mission 3 · Working Prototype v0.1 — demo video + repo (+35, +20)', 'Teach-Back (+15)'] },
    { week: 6, title: 'Midpoint + User Testing', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · User Testing — 3+ sessions, feedback log, iteration plan (+40, +20)'] },
    { week: 7, title: 'v1.0 Build + Recruit', ptsRange: '70–100', missions: ['Mission 5 · v1.0 Release — shipped, deployed, documented (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Client Onboarding', ptsRange: '65–95', missions: ['Mission 6 · Deploy + Onboard Client — training docs, handover session, support plan (+40, +20)'] },
    { week: 9, title: 'Capstone — Product Dossier', ptsRange: '65–95', missions: ['Mission 7 · Product Dossier: spec, architecture, evals, usage metrics, roadmap (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Dossier refinement'] },
    { week: 11, title: 'Peer Vote', ptsRange: '50–80', missions: ['Finalize'] },
    { week: 12, title: 'Demo Day', ptsRange: '60–80', missions: ['Demo Day · 8 min live demo (+50)', 'Corps induction'] },
  ],
  POL: [
    { week: 3, title: 'Client Sign + Research Brief', ptsRange: '85–125', missions: ['Client Sign-Off (+50)', 'Mission 1 · Research Brief + Hypotheses — scope, questions, methodology (+35, +20)'] },
    { week: 4, title: 'Secondary Research + Lit Review', ptsRange: '60–90', missions: ['Mission 2 · Literature Review — 15+ sources, synthesis memo (+35, +20)'] },
    { week: 5, title: 'Primary Research · Interviews', ptsRange: '65–95', missions: ['Mission 3 · 5+ Expert Interviews — transcripts, coded insights (+35, +20)', 'Teach-Back (+15)'] },
    { week: 6, title: 'Midpoint + Data Analysis', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · Analysis + Findings Memo — key insights, implications (+40, +20)'] },
    { week: 7, title: 'Draft Report + Recruit', ptsRange: '70–100', missions: ['Mission 5 · Full Report Draft — publication-ready draft (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Client Review + Revision', ptsRange: '65–95', missions: ['Mission 6 · Client Review Session + Revisions — submit revision log (+40, +20)'] },
    { week: 9, title: 'Capstone — Final Report + Brief', ptsRange: '65–95', missions: ['Mission 7 · Final Report + Executive Brief + Policy Recommendations (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Report finalization'] },
    { week: 11, title: 'Peer Vote', ptsRange: '50–80', missions: ['Finalize'] },
    { week: 12, title: 'Demo Day', ptsRange: '60–80', missions: ['Demo Day · 8-min findings presentation (+50)', 'Corps induction'] },
  ],
  CC: [
    { week: 3, title: 'Client Sign + Social Media Brand Audit', ptsRange: '85–125', missions: ['Client Sign-Off (+50)', 'Mission 1 · Full Brand Audit — all platforms: followers, engagement, posts, tone, competitors. Audit Report + Scorecard + 10 recs (+35, +20)'] },
    { week: 4, title: 'Brand Voice Guide + Content Strategy', ptsRange: '60–90', missions: ['Mission 2 · Brand Voice + 90-Day Strategy — pillars, platforms, frequency, format mix, KPIs (+35, +20)', 'Client touchpoint (+15)'] },
    { week: 5, title: 'AI Content System + Month 1 Batch', ptsRange: '65–95', missions: ['Mission 3 · AI Content Workflow + 12 posts designed and scheduled for Month 1 (+40, +20)', 'Teach-Back (+15)'] },
    { week: 6, title: 'Midpoint + Community SOP + Month 2', ptsRange: '55–85', missions: ['Midpoint Fire Check (+10)', 'Mission 4 · Community Management SOP + Month 2 content batch (12 posts) (+40, +20)'] },
    { week: 7, title: 'Campaign Design + Recruit', ptsRange: '70–100', missions: ['Mission 5 · AI-Powered Campaign — brief, concept, 5 pieces, measurement plan (+40, +20)', 'Recruit Scout (+30)'] },
    { week: 8, title: 'Performance Report + Optimization', ptsRange: '65–95', missions: ['Mission 6 · Mid-Program Analytics Report — reach, engagement, growth, recs (+40, +20 if positive growth)'] },
    { week: 9, title: 'Capstone — Full Playbook', ptsRange: '65–95', missions: ['Mission 7 · Complete Social Media Playbook — voice + strategy + archives + SOP + campaign + 90-day report (+50, +20)'] },
    { week: 10, title: 'Capstone Build', ptsRange: '65–95', missions: ['Playbook finalization'] },
    { week: 11, title: 'Peer Vote', ptsRange: '50–80', missions: ['Finalize'] },
    { week: 12, title: 'Demo Day', ptsRange: '60–80', missions: ['Demo Day · 8-min presentation with growth numbers (+50)', 'Corps induction'] },
  ],
};

Object.assign(window, {
  COHORT, TRACKS, TIERS, USERS, MISSIONS, RITUALS, BADGES, ACTIVITY,
  ME, ME_RANK, ME_ID,
  COMMANDER, LEADS, PENDING_SUBS, ESCALATIONS, ROLE_IDENTITIES,
  DIRECTIVES,
  POINTS_RUBRIC, UNIVERSAL_WEEKS, TRACK_BRIEFS, DISCOVERY_TIERS, PROSPECTS,
});
