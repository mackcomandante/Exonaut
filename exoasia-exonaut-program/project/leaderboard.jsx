// Leaderboard screen — full cohort view with tabs + filters

function Leaderboard({ onBack }) {
  const [tab, setTab] = React.useState('cohort');
  const [trackFilter, setTrackFilter] = React.useState('all');
  const [tierFilter, setTierFilter] = React.useState('all');
  const [sortPillar, setSortPillar] = React.useState(null);

  let sorted = [...USERS];
  if (sortPillar === 'p1') sorted.sort((a,b) => b.p1 - a.p1);
  else if (sortPillar === 'p2') sorted.sort((a,b) => b.p2 - a.p2);
  else if (sortPillar === 'p3') sorted.sort((a,b) => b.p3 - a.p3);
  else sorted.sort((a,b) => b.points - a.points);

  let filtered = sorted;
  if (trackFilter !== 'all') filtered = filtered.filter(u => u.track === trackFilter);
  if (tierFilter !== 'all') filtered = filtered.filter(u => u.tier === tierFilter);

  if (tab === 'week') {
    // Fake weekly: random subset of points (stable per id)
    filtered = filtered.map(u => ({ ...u, weekPoints: 20 + (hashName(u.id) % 90) })).sort((a,b) => b.weekPoints - a.weekPoints);
  }

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8 }}>Cohort Ranking · Real-Time</div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Leaderboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="t-mono" style={{ color: 'var(--off-white-40)', fontSize: 11, letterSpacing: '0.1em' }}>
            {COHORT.code} · {filtered.length} EXONAUTS
          </div>
        </div>
      </div>

      <div className="leaderboard-tabs">
        <div className={'lb-tab' + (tab === 'cohort' ? ' active' : '')} onClick={() => { setTab('cohort'); setSortPillar(null); }}>
          Full Cohort
        </div>
        <div className={'lb-tab' + (tab === 'week' ? ' active' : '')} onClick={() => { setTab('week'); setSortPillar(null); }}>
          This Week
        </div>
        <div className={'lb-tab' + (tab === 'pillar' ? ' active' : '')} onClick={() => setTab('pillar')}>
          Pillar View
        </div>
        <div className={'lb-tab' + (tab === 'alumni' ? ' active' : '')} onClick={() => setTab('alumni')}>
          Alumni Hall
        </div>
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
          <div key={t.code} className={'lb-filter' + (trackFilter === t.code ? ' active' : '')} onClick={() => setTrackFilter(t.code)}>
            {t.short}
          </div>
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
          <div className="t-body" style={{ maxWidth: 420, margin: '0 auto' }}>
            The first Exonaut Corps will be inducted on <span style={{ color: 'var(--ink)' }}>JAN 29 2027</span>. Become the precedent.
          </div>
        </div>
      ) : (
        <div className="lb-table">
          <div className="lb-header">
            <div>RANK</div>
            <div></div>
            <div>EXONAUT</div>
            <div className="col-track">TRACK</div>
            <div className="col-bars">P1 · P2 · P3</div>
            <div>{tab === 'week' ? 'WK PTS' : sortPillar ? `${sortPillar.toUpperCase()}` : 'POINTS'}</div>
            <div className="col-change">Δ</div>
            <div>BDG</div>
          </div>
          {filtered.map((u, i) => {
            const rank = i + 1;
            const top = rank <= 3 ? ` top-${rank}` : '';
            const track = TRACKS.find(t => t.code === u.track);
            const displayPts = tab === 'week' ? u.weekPoints : sortPillar ? u[sortPillar] : u.points;
            return (
              <div key={u.id} className={'lb-row' + (u.me ? ' me' : '') + top}>
                <div className="lb-rank">
                  {rank <= 3 && <i className="fa-solid fa-crown" />}
                  #{rank}
                </div>
                <AvatarWithRing name={u.name} size={36} tier={u.tier} />
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
                <div className="lb-points">{displayPts}</div>
                <div className="col-change"><ChangeArrow n={u.change} /></div>
                <div className="lb-badges">{u.badges}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {tab !== 'alumni' && (
        <div style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--off-white-40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 4, background: 'var(--lime)' }} /> P1 · PROJECT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 4, background: 'var(--platinum)' }} /> P2 · CLIENT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 4, background: 'var(--lavender)' }} /> P3 · RECRUIT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderLeft: '2px solid var(--lime)' }} /> YOUR ROW
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Leaderboard });
