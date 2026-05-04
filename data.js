// Exonaut Platform — seed data for mid-pack Prime persona in Week 2

const COHORT = {
  code: 'EXO-BATCH-2026',
  name: 'Batch 2026–2027',
  week: (() => {
    const start = new Date('2026-10-06');
    const now = new Date();
    if (now < start) return 0;
    return Math.min(Math.floor((now - start) / (7 * 86400000)) + 1, 12);
  })(),
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
  // Populated via sign-up. Exonauts register through the portal.
];

const ME_ID = localStorage.getItem('exo:userId') || null;

const MISSIONS = [];

const RITUALS = [
  { id: 'mon-ign', name: 'Monday Ignition', points: 5,  hashtag: '#MondayIgnition' },
  { id: 'mid-pls', name: 'Mid-Week Pulse',  points: 3,  hashtag: '#MidWeekPulse'   },
  { id: 'fri-win', name: 'Friday Win Wall', points: 5,  hashtag: '#FridayWin'       },
];

const BADGES = [
  // Milestone
  { code: 'MIL-BRZ', name: 'Bronze Builder',   subtitle: '100 points',  category: 'milestone', color: '#CD7F32', earned: false },
  { code: 'MIL-SLV', name: 'Silver Strategist', subtitle: '300 points', category: 'milestone', color: '#A8B4BE', earned: false },
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
  { code: 'SPL-IOW', name: 'Intern of Week',   subtitle: 'Weekly award',      category: 'special', color: '#FFB020', earned: false },
  { code: 'SPL-DIS', name: 'Most Likely to Disrupt', subtitle: 'Program-end award', category: 'special', color: '#FF5B5B', earned: false },
  { code: 'SPL-CLT', name: 'Culture Carrier',  subtitle: 'Most kudos received', category: 'special', color: '#B095C5', earned: false },
  { code: 'SPL-FUL', name: 'Full Cycle',       subtitle: 'All rituals attended', category: 'special', color: '#22C55E', earned: false },
  { code: 'SPL-PIP', name: 'Pipeline Builder', subtitle: '3+ recruits placed', category: 'special', color: '#8BE8FF', earned: false },
];

const ACTIVITY = [];

// Resolve ME: check USERS first, then registered-user registry, then fallback to u14.
// (user-store.jsx hasn't loaded yet so read the registry key directly.)
let ME = USERS.find(u => u.id === ME_ID);
if (!ME) {
  const _cachedName = localStorage.getItem('exo:userName');
  if (_cachedName) {
    ME = { id: ME_ID, name: _cachedName, track: localStorage.getItem('exo:userTrack') || 'AIS', tier: 'entry', points: 0, badges: 0, p1: 0, p2: 0, p3: 0 };
  }
}
if (!ME) ME = { id: 'guest', name: 'Exonaut', track: 'AIS', tier: 'entry', points: 0, badges: 0, p1: 0, p2: 0, p3: 0 };
const ME_RANK = USERS.sort((a,b) => b.points - a.points).findIndex(u => u.id === ME.id) + 1;

// ==== ORG HIERARCHY ====
// Director (Mission Commander) → Managers (Mission Leads, 1 per track) → Interns (Exonauts)
const COMMANDER = {
  id: 'cmdr-01', name: 'Mack Comandante', role: 'director',
  title: 'Mission Commander',
  yearsAtExoasia: 4, cohortsRun: 3,
};

const LEADS = [
  { id: 'lead-ais', name: 'Lead · AI Strategy',   role: 'manager', track: 'AIS', reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-vb',  name: 'Lead · Venture Build', role: 'manager', track: 'VB',  reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-ld',  name: 'Lead · L&D',           role: 'manager', track: 'LD',  reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-xm',  name: 'Lead · Experience',    role: 'manager', track: 'XM',  reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-aid', name: 'Lead · AI Dev',        role: 'manager', track: 'AID', reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-pol', name: 'Lead · Policy',        role: 'manager', track: 'POL', reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
  { id: 'lead-cc',  name: 'Lead · Content',       role: 'manager', track: 'CC',  reports: [], reviewQueue: 0, avgSubmitRate: 0, satisfaction: 0 },
];

const PENDING_SUBS = [];

const DIRECTIVES = [];

const ESCALATIONS = [];

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

const PROSPECTS = [
  // Exonauts add their own prospects once enrolled.
  /*{
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
  },*/
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

// Credential lookup: email → { password, role, userId, homeRoute }
// Passwords: {FirstName}2026 for everyone; role determines the view they land in.
const CREDENTIALS = {
  // ── Mission Leads (placeholder slots — update names/passwords when assigned) ──
  'lead.ais@exoasia.hub':   { password: 'LeadAIS2026',  role: 'lead',      userId: 'lead-ais', homeRoute: 'lead-home' },
  'lead.vb@exoasia.hub':    { password: 'LeadVB2026',   role: 'lead',      userId: 'lead-vb',  homeRoute: 'lead-home' },
  'lead.ld@exoasia.hub':    { password: 'LeadLD2026',   role: 'lead',      userId: 'lead-ld',  homeRoute: 'lead-home' },
  'lead.xm@exoasia.hub':    { password: 'LeadXM2026',   role: 'lead',      userId: 'lead-xm',  homeRoute: 'lead-home' },
  'lead.aid@exoasia.hub':   { password: 'LeadAID2026',  role: 'lead',      userId: 'lead-aid', homeRoute: 'lead-home' },
  'lead.pol@exoasia.hub':   { password: 'LeadPOL2026',  role: 'lead',      userId: 'lead-pol', homeRoute: 'lead-home' },
  'lead.cc@exoasia.hub':    { password: 'LeadCC2026',   role: 'lead',      userId: 'lead-cc',  homeRoute: 'lead-home' },
  // ── Commander & Admin ─────────────────────────────────────────────────────
  'mack.comandante@exoasia.hub': { password: 'Mack2026', role: 'commander', userId: 'cmdr-01',  homeRoute: 'cmdr-home' },
  'admin@exoasia.hub':           { password: 'Admin2026', role: 'admin',    userId: 'admin-01', homeRoute: 'pa-cohorts' },
};

Object.assign(window, {
  COHORT, TRACKS, TIERS, USERS, MISSIONS, RITUALS, BADGES, ACTIVITY,
  ME, ME_RANK, ME_ID,
  COMMANDER, LEADS, PENDING_SUBS, ESCALATIONS, ROLE_IDENTITIES,
  DIRECTIVES, CREDENTIALS,
  POINTS_RUBRIC, UNIVERSAL_WEEKS, TRACK_BRIEFS, DISCOVERY_TIERS, PROSPECTS,
});
