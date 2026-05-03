// Leaderboard screen backed by the shared point ledger.

function Leaderboard({ onBack }) {
  const { profile } = useCurrentUserProfile();
  const activeCohort = window.getActiveCohort?.(profile) || COHORT;
  const demoDay = window.getCohortDemoDay?.(activeCohort) || COHORT.demoDay;
  const rowsBase = useSupabaseExonautRows();
  const [tab, setTab] = React.useState('cohort');
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [tierFilter, setTierFilter] = React.useState('all');
  const [sortPillar, setSortPillar] = React.useState(null);

  let filtered = rowsBase.map(u => ({
    ...u,
    tier: u.points >= 900 ? 'apex' : u.points >= 600 ? 'elite' : u.points >= 300 ? 'prime' : u.points >= 100 ? 'builder' : 'entry',
    badges: MILESTONES.filter(m => u.points >= m.at).length,
  }));

  if (trackFilter !== 'all') filtered = filtered.filter(u => u.track === trackFilter);
  if (tierFilter !== 'all') filtered = filtered.filter(u => u.tier === tierFilter);
  if (sortPillar === 'p1') filtered.sort((a,b) => b.p1 - a.p1);
  else if (sortPillar === 'p2') filtered.sort((a,b) => b.p2 - a.p2);
  else if (sortPillar === 'p3') filtered.sort((a,b) => b.p3 - a.p3);
  else filtered.sort((a,b) => b.points - a.points);

  if (tab === 'week') {
    filtered = filtered.map(u => ({ ...u, weekPoints: u.points })).sort((a,b) => b.weekPoints - a.weekPoints);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Cohort Ranking · Real-Time</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Leaderboard</h1>
        </div>
        <div className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11, letterSpacing: '0.1em' }}>
          {(activeCohort?.code || COHORT.code)} · {filtered.length} EXONAUTS
        </div>
      </div>

      <div className="leaderboard-tabs">
        <div className={'lb-tab' + (tab === 'cohort' ? ' active' : '')} onClick={() => { setTab('cohort'); setSortPillar(null); }}>Full Cohort</div>
        <div className={'lb-tab' + (tab === 'week' ? ' active' : '')} onClick={() => { setTab('week'); setSortPillar(null); }}>This Week</div>
        <div className={'lb-tab' + (tab === 'pillar' ? ' active' : '')} onClick={() => setTab('pillar')}>Pillar View</div>
        <div className={'lb-tab' + (tab === 'alumni' ? ' active' : '')} onClick={() => setTab('alumni')}>Alumni Hall</div>
      </div>

      {tab === 'pillar' && (
        <div className="lb-filters" style={{ marginBottom: 16 }}>
          <span className="t-label-muted" style={{ alignSelf: 'center', marginRight: 4 }}>SORT BY:</span>
          <div className={'lb-filter' + (sortPillar === 'p1' ? ' active' : '')} onClick={() => setSortPillar('p1')}>Project</div>
          <div className={'lb-filter' + (sortPillar === 'p2' ? ' active' : '')} onClick={() => setSortPillar('p2')}>Client</div>
          <div className={'lb-filter' + (sortPillar === 'p3' ? ' active' : '')} onClick={() => setSortPillar('p3')}>Recruitment</div>
        </div>
      )}

      <div className="lb-filters">
        <div className={'lb-filter' + (trackFilter === 'all' ? ' active' : '')} onClick={() => setTrackFilter('all')}>All Tracks</div>
        {TRACKS.map(t => (
          <div key={t.code} className={'lb-filter' + (trackFilter === t.code ? ' active' : '')} onClick={() => setTrackFilter(t.code)}>{t.short}</div>
        ))}
      </div>

      <div className="lb-filters">
        <div className={'lb-filter' + (tierFilter === 'all' ? ' active' : '')} onClick={() => setTierFilter('all')}>All Tiers</div>
        {['entry','builder','prime','elite','apex'].map(t => (
          <div key={t} className={'lb-filter' + (tierFilter === t ? ' active' : '')}
            style={{ color: tierFilter === t ? TIERS[t].color : undefined, borderColor: tierFilter === t ? TIERS[t].color : undefined }}
            onClick={() => setTierFilter(t)}>
            {TIERS[t].short}
          </div>
        ))}
      </div>

      {tab === 'alumni' ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: 64 }}>
          <i className="fa-solid fa-lock" style={{ fontSize: 32, color: 'var(--lavender)', marginBottom: 16 }} />
          <div className="t-heading" style={{ fontSize: 18, marginBottom: 8 }}>Alumni Hall Opens Post-Demo Day</div>
          <div className="t-body" style={{ maxWidth: 420, margin: '0 auto' }}>The first Exonaut Corps will be inducted on <span style={{ color: 'var(--ink)' }}>{demoDay}</span>.</div>
        </div>
      ) : (
        <div className="lb-table">
          <div className="lb-header">
            <div>RANK</div><div></div><div>EXONAUT</div><div className="col-track">TRACK</div><div className="col-bars">P1 · P2 · P3</div><div>{tab === 'week' ? 'WK PTS' : sortPillar ? `${sortPillar.toUpperCase()}` : 'POINTS'}</div><div className="col-change">Δ</div><div>BDG</div>
          </div>
          {filtered.map((u, i) => {
            const rank = i + 1;
            const top = rank <= 3 ? ` top-${rank}` : '';
            const track = TRACKS.find(t => t.code === u.track);
            const displayPts = tab === 'week' ? u.weekPoints : sortPillar ? u[sortPillar] : u.points;
            return (
              <div key={u.id} className={'lb-row' + (u.id === profile.id ? ' me' : '') + top}>
                <div className="lb-rank">{rank <= 3 && <i className="fa-solid fa-crown" />}#{rank}</div>
                <AvatarWithRing name={u.name} avatarUrl={u.avatarUrl} size={36} tier={u.tier} />
                <div className="lb-name">{u.name}<TierCrest tier={u.tier} /></div>
                <div className="lb-track col-track">{track?.short}</div>
                <div className="col-bars">
                  <div className="lb-bars">
                    <div className="seg p1" style={{ width: `${u.points ? (u.p1 / u.points) * 100 : 0}%` }} />
                    <div className="seg p2" style={{ width: `${u.points ? (u.p2 / u.points) * 100 : 0}%` }} />
                    <div className="seg p3" style={{ width: `${u.points ? (u.p3 / u.points) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="lb-points">{displayPts}</div>
                <div className="col-change"><ChangeArrow n={u.change} /></div>
                <div className="lb-badges">{u.badges}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Leaderboard });
