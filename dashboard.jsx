// Dashboard screen — hero stats, pillars, rituals, missions, activity

function StatCell({ label, icon, value, unit, meta, metaDir, lime }) {
  return (
    <div className="stat-cell">
      <div className="stat-label"><i className={'fa-solid ' + icon} />{label}</div>
      <div className={'stat-value' + (lime ? ' lime' : '')}>
        <span>{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {meta && (
        <div className="stat-meta">
          <span className={metaDir === 'up' ? 'up' : metaDir === 'down' ? 'down' : ''}>
            {metaDir === 'up' && <i className="fa-solid fa-caret-up" />}
            {metaDir === 'down' && <i className="fa-solid fa-caret-down" />}
            {' '}{meta}
          </span>
        </div>
      )}
    </div>
  );
}

function HeroStats() {
  const { total: livePoints, delta: liveDelta } = useComputedPoints(ME_ID);
  const liveBadges = useLiveBadges();
  const earnedCount = liveBadges.filter(b => b.earned).length;

  const tierOrder = ['entry', 'builder', 'prime', 'elite', 'apex', 'corps'];
  const tierKey = livePoints >= 900 ? 'apex' : livePoints >= 600 ? 'elite' : livePoints >= 300 ? 'prime' : livePoints >= 100 ? 'builder' : 'entry';
  const tierIdx = tierOrder.indexOf(tierKey);
  const nextTierKey = tierIdx < tierOrder.length - 1 ? tierOrder[tierIdx + 1] : null;
  const nextTierMin = nextTierKey && TIERS[nextTierKey]?.min != null ? TIERS[nextTierKey].min : null;
  const tierLabel = tierKey.toUpperCase();
  const tierMeta = nextTierKey && nextTierMin != null ? `${Math.max(0, nextTierMin - livePoints)} TO ${nextTierKey.toUpperCase()}` : 'MAX TIER';

  const activeMissions = MISSIONS.filter(m => m.status !== 'approved');

  return (
    <div className="stat-grid card-hud">
      <StatCell label="TOTAL POINTS" icon="fa-bolt" value={livePoints} lime
        meta={liveDelta > 0 ? `AUTO · +${liveDelta} JUST GRADED` : null} metaDir="up" />
      <StatCell label="RANK" icon="fa-ranking-star"
        value={`#${ME_RANK}`} unit={`of ${COHORT.size}`} />
      <StatCell label="TIER" icon="fa-shield-halved"
        value={tierLabel} meta={tierMeta} metaDir="flat" />
      <StatCell label="MISSIONS" icon="fa-bullseye"
        value={activeMissions.length} unit={`of ${MISSIONS.length}`} />
      <StatCell label="BADGES" icon="fa-medal"
        value={earnedCount} unit="of 22" />
    </div>
  );
}

function PillarCard({ idx, klass, title, weight, current, max, caption, children }) {
  return (
    <div className={'pillar-card ' + klass}>
      <div className="pillar-head">
        <span className="pillar-idx">PILLAR {idx} · {weight}% WEIGHTED</span>
        <span className="pillar-weight">{caption}</span>
      </div>
      <h3 className="pillar-title">{title}</h3>
      <div className="pillar-score">
        <span className="num">{current}</span>
        <span className="max">/ {max} PTS</span>
      </div>
      <div className="pillar-bar"><div className="fill" style={{ width: `${(current / max) * 100}%` }} /></div>
      {children}
    </div>
  );
}

function PillarGrid() {
  return (
    <div className="pillar-grid">
      <PillarCard idx="01" klass="p1" title="Project" weight={40}
        current={ME.p1} max={400} caption="40% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>RECENT SUBMISSIONS</div>
        {ME.p1 === 0
          ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--off-white-40)' }}>No submissions yet.</div>
          : null}
      </PillarCard>

      <PillarCard idx="02" klass="p2" title="Client" weight={35}
        current={ME.p2} max={350} caption="35% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>CLIENT STATUS</div>
        {ME.p2 === 0
          ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--off-white-40)' }}>No client assigned yet.</div>
          : null}
      </PillarCard>

      <PillarCard idx="03" klass="p3" title="Recruitment" weight={25}
        current={ME.p3} max={250} caption="25% WEIGHT">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em', marginBottom: 10 }}>PIPELINE STATUS</div>
        {ME.p3 === 0
          ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--off-white-40)', marginBottom: 14 }}>No recruits submitted yet.</div>
          : null}
        <button className="btn btn-ghost btn-sm" onClick={() => window.__openKudos?.()}>
          <i className="fa-solid fa-user-plus" /> ADD A RECRUIT
        </button>
      </PillarCard>
    </div>
  );
}

function weekDateRange(weekNum) {
  const start = new Date('2026-10-06');
  const ws = new Date(start); ws.setDate(start.getDate() + (weekNum - 1) * 7);
  const we = new Date(ws); we.setDate(ws.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return `${fmt(ws)} — ${fmt(we)}`;
}

function RitualTracker() {
  const userId = ME_ID;
  const weekNum = COHORT.week;
  const { weekData, refresh } = window.useRituals ? window.useRituals(userId, weekNum) : { weekData: {}, refresh: () => {} };

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-head">
        <h2>Weekly Ritual Tracker</h2>
        <span className="section-meta">WEEK {weekNum} · {weekNum > 0 ? weekDateRange(weekNum) : 'COHORT NOT STARTED'}</span>
      </div>
      <div className="ritual-row">
        {RITUALS.map(r => {
          const state = weekData[r.id]?.state || 'not-started';
          const iconCls = state === 'confirmed' ? 'fa-circle-check' : state === 'submitted' ? 'fa-circle-half-stroke' : 'fa-circle-dot';
          const cCls = state === 'confirmed' ? 'done-c' : state === 'submitted' ? 'done-c' : 'pend-c';
          const label = state === 'confirmed' ? 'CONFIRMED' : state === 'submitted' ? 'SUBMITTED' : 'PENDING';
          return (
            <div key={r.id} className={'ritual-cell ' + (state === 'not-started' ? 'not-started' : 'done')}>
              <div className="ritual-head">
                <div className="ritual-name">{r.name}</div>
                <i className={'fa-solid ' + iconCls + ' ritual-icon ' + cCls} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.05em' }}>{label}</div>
              <div className="ritual-points">+{r.points} PTS</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MissionFeed({ onOpenMission }) {
  const upcoming = MISSIONS.filter(m => m.status !== 'approved').sort((a,b) => a.dueIn - b.dueIn);
  return (
    <div>
      <div className="section-head">
        <h2>Mission Feed</h2>
        <span className="section-meta">{upcoming.length} ACTIVE · SORTED BY DUE DATE</span>
      </div>
      <div>
        {upcoming.map(m => {
          const isOverdue = m.dueIn < 0 && m.status !== 'approved';
          const statusMap = {
            'not-started': { cls: 'status-not-started', label: 'NOT STARTED', cta: 'START' },
            'in-progress': { cls: 'status-in-progress', label: 'IN PROGRESS', cta: 'CONTINUE' },
            'submitted':   { cls: 'status-submitted', label: 'SUBMITTED', cta: 'VIEW' },
            'needs-revision': { cls: 'status-needs-revision', label: 'NEEDS REVISION', cta: 'REVISE' },
            'overdue':     { cls: 'status-overdue', label: 'OVERDUE', cta: 'SUBMIT NOW' },
          };
          const s = isOverdue ? statusMap.overdue : statusMap[m.status];
          const track = m.track ? TRACKS.find(t => t.code === m.track) : null;
          return (
            <div key={m.id} className="mission-row" onClick={() => onOpenMission(m.id)}>
              <div className="mission-meta">
                <div className="mission-id">{m.id}</div>
                <div className="mission-title">{m.title}</div>
                <div className="mission-sub">
                  {track ? track.short : 'ALL-COHORT'} · {m.pillar.toUpperCase()} · DUE {m.dueDate}
                  {isOverdue && <span style={{ color: 'var(--red)' }}> · OVERDUE {Math.abs(m.dueIn)}d</span>}
                </div>
              </div>
              <div className="mission-points"><span className="plus">+</span>{m.points}</div>
              <span className={'status-pill ' + s.cls}>{s.label}</span>
              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenMission(m.id); }}>
                {s.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="card-panel">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Activity</h2>
        <span className="section-meta">LAST 48H</span>
      </div>
      {ACTIVITY.map((a, i) => (
        <div key={i} className="activity-item">
          <div className={'activity-icon type-' + a.type}><i className={'fa-solid ' + a.icon} /></div>
          <div className="activity-body">
            <div dangerouslySetInnerHTML={{ __html: a.body }} />
            {a.sub && <div className="muted" style={{ marginTop: 2 }}>{a.sub}</div>}
          </div>
          <div className="activity-time">{a.time}</div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardSnapshot({ onView }) {
  const sorted = [...USERS].sort((a,b) => b.points - a.points);
  const meIdx = sorted.findIndex(u => u.id === ME_ID);
  const rows = [
    ...sorted.slice(0, 3),
    ...(meIdx > 3 ? [sorted[meIdx - 1]] : []),
    ...(meIdx > 2 ? [sorted[meIdx]] : []),
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <div className="section-head">
        <h2>Leaderboard Snapshot</h2>
        <button className="btn btn-ghost btn-sm" onClick={onView}>
          VIEW FULL <i className="fa-solid fa-arrow-right" style={{ marginLeft: 2 }} />
        </button>
      </div>
      <div className="lb-table">
        {rows.map((u, i) => {
          const rank = sorted.findIndex(x => x.id === u.id) + 1;
          const top = rank <= 3 ? ` top-${rank}` : '';
          const track = TRACKS.find(t => t.code === u.track);
          return (
            <div key={u.id} className={'lb-row' + (u.me ? ' me' : '') + top}>
              <div className="lb-rank">
                {rank <= 3 && <i className="fa-solid fa-crown" />}
                #{rank}
              </div>
              <AvatarWithRing name={u.name} size={34} tier={u.tier} />
              <div className="lb-name">
                {u.name}
                <TierCrest tier={u.tier} />
              </div>
              <div className="lb-track col-track">{track?.short}</div>
              <div className="col-bars">
                <div className="lb-bars">
                  <div className="seg p1" style={{ width: `${(u.p1 / u.points) * 100}%` }} />
                  <div className="seg p2" style={{ width: `${(u.p2 / u.points) * 100}%` }} />
                  <div className="seg p3" style={{ width: `${(u.p3 / u.points) * 100}%` }} />
                </div>
              </div>
              <div className="lb-points">{u.points}</div>
              <div className="col-change"><ChangeArrow n={u.change} /></div>
              <div className="lb-badges">{u.badges}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, onOpenMission }) {
  return (
    <div>
      <div className="section-head enter">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Welcome back, Exonaut</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>{ME.name}</h1>
          <div className="t-body" style={{ marginTop: 8, color: 'var(--lavender)', fontStyle: 'italic' }}>
            "We don't wait for the map. We build it."
          </div>
        </div>
        {(() => {
          const start = new Date('2026-10-06');
          const demoDay = new Date('2027-01-29');
          const now = new Date();
          const totalDays = Math.round((demoDay - start) / 86400000);
          const elapsed = now < start ? 0 : Math.min(Math.round((now - start) / 86400000), totalDays);
          const remaining = Math.max(0, totalDays - elapsed);
          const started = now >= start;
          return (
            <div style={{ textAlign: 'right' }}>
              <div className="t-label-muted">{started ? 'DAY' : 'STARTS'}</div>
              <div className="t-mono" style={{ fontSize: 40, color: 'var(--off-white)', fontWeight: 700, lineHeight: 1 }}>
                {started
                  ? <>{elapsed}<span style={{ color: 'var(--off-white-40)', fontSize: 22 }}>/{totalDays}</span></>
                  : <span style={{ fontSize: 22 }}>OCT 06</span>}
              </div>
              {started && <div className="t-micro" style={{ marginTop: 6 }}>{remaining} DAYS TO DEMO DAY</div>}
            </div>
          );
        })()}
      </div>

      <div className="enter enter-d1"><HeroStats /></div>
      <div className="enter enter-d2"><PillarGrid /></div>
      <div className="enter enter-d3"><RitualTracker /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }} className="dash-split">
        <div className="enter enter-d4"><MissionFeed onOpenMission={onOpenMission} /></div>
        <div className="enter enter-d4"><ActivityFeed /></div>
      </div>

      <div className="enter enter-d5"><LeaderboardSnapshot onView={() => onNavigate('leaderboard')} /></div>
    </div>
  );
}

Object.assign(window, { Dashboard });
