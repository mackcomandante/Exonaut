// ============================================================================
// Commander: Exonaut of the Week.
// Shows Top 3 per cohort based on weekly-points synthesizer (Fri→Thu window).
// Includes a LinkedIn-ready share card generator per winner.
// ============================================================================

// -------- Date pill --------
function EowDatePill({ label, value, accent }) {
  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--off-white-07)',
      border: '1px solid var(--off-white-15)',
      borderRadius: 2,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div className="t-mono" style={{ fontSize: 8, letterSpacing: '0.1em', color: 'var(--off-white-40)' }}>{label}</div>
      <div className="t-heading" style={{ fontSize: 13, color: accent || 'var(--off-white)', textTransform: 'none', letterSpacing: 0 }}>{value}</div>
    </div>
  );
}

// -------- Week stepper --------
function EowWeekStepper({ weekNumber, totalWeeks, onChange, window: win }) {
  const canPrev = weekNumber > 1;
  const canNext = weekNumber < totalWeeks;
  const isCurrent = weekNumber === EOW.currentWeek();

  const btn = (enabled, onClick, icon) => (
    <button onClick={enabled ? onClick : undefined} disabled={!enabled} style={{
      width: 36, height: 36, background: 'var(--off-white-07)',
      border: '1px solid var(--off-white-15)', borderRadius: 2,
      color: enabled ? 'var(--off-white)' : 'var(--off-white-40)',
      cursor: enabled ? 'pointer' : 'not-allowed', display: 'grid', placeItems: 'center',
    }}>
      <i className={'fa-solid ' + icon} style={{ fontSize: 11 }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {btn(canPrev, () => onChange(weekNumber - 1), 'fa-chevron-left')}
      <div style={{
        padding: '8px 16px', background: 'var(--off-white-07)',
        border: '1px solid ' + (isCurrent ? 'var(--lime)' : 'var(--off-white-15)'),
        borderRadius: 2, minWidth: 220, textAlign: 'center',
      }}>
        <div className="t-mono" style={{ fontSize: 9, letterSpacing: '0.1em', color: isCurrent ? 'var(--lime)' : 'var(--off-white-40)' }}>
          WEEK {String(weekNumber).padStart(2, '0')} {isCurrent ? '· CURRENT' : ''}
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: 'var(--off-white)', letterSpacing: '0.06em', marginTop: 3 }}>
          {win.label}
        </div>
      </div>
      {btn(canNext, () => onChange(weekNumber + 1), 'fa-chevron-right')}
      {!isCurrent && (
        <button onClick={() => onChange(EOW.currentWeek())} style={{
          padding: '8px 12px', background: 'transparent',
          border: '1px solid var(--lime)', borderRadius: 2, color: 'var(--lime)',
          cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
        }}>JUMP TO CURRENT</button>
      )}
    </div>
  );
}

// -------- Daily bar sparkline --------
function EowSparkline({ breakdown, accent = 'var(--lime)' }) {
  const max = Math.max(1, ...breakdown.map(d => d.points));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 42 }}>
      {breakdown.map((d, i) => {
        const h = Math.max(3, Math.round((d.points / max) * 42));
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: '100%', height: h, background: accent, borderRadius: 1, opacity: d.points === 0 ? 0.2 : 1,
            }} />
            <div className="t-mono" style={{ fontSize: 7, color: 'var(--off-white-40)', letterSpacing: '0.08em' }}>
              {d.day[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Winner card — top 3 tile on the Commander view.
// ============================================================================
function EowWinnerCard({ entry, cohort, weekNumber, window: win, onShare }) {
  const { user, rank, weekPoints, breakdown } = entry;
  const track = TRACKS.find(t => t.code === getUserTrack(user.id));
  const manager = getUserLead(user.id);

  const medal = rank === 1 ? '#F4C542' : rank === 2 ? '#B8C2CE' : '#CD7F32';
  const medalLabel = rank === 1 ? 'GOLD · EOW' : rank === 2 ? 'SILVER · 2ND' : 'BRONZE · 3RD';
  const accent = rank === 1 ? 'var(--lime)' : 'var(--platinum)';

  return (
    <div className="card-panel" style={{
      padding: 20, borderColor: rank === 1 ? medal : undefined,
      boxShadow: rank === 1 ? '0 0 28px rgba(244,197,66,0.14)' : undefined,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Rank + medal stripe */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px', background: medal + '20', border: '1px solid ' + medal, borderRadius: 2,
        }}>
          <i className="fa-solid fa-medal" style={{ fontSize: 10, color: medal }} />
          <span className="t-mono" style={{ fontSize: 9, color: medal, letterSpacing: '0.12em', fontWeight: 700 }}>
            {medalLabel}
          </span>
        </div>
        <div className="t-heading" style={{
          fontSize: 28, margin: 0, textTransform: 'none', letterSpacing: 0,
          color: accent, lineHeight: 1,
        }}>#{rank}</div>
      </div>

      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <AvatarWithRing name={user.name} size={64} tier={user.tier} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="t-heading" style={{
            fontSize: 18, margin: '0 0 3px 0', textTransform: 'none', letterSpacing: 0,
            color: 'var(--off-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{user.name}</h2>
          <div className="t-mono" style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--off-white-68)' }}>
            {track?.short || ''} · {manager ? manager.name.split(' ').slice(-1)[0] : 'Unassigned'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ padding: '10px 12px', background: 'var(--off-white-07)', borderRadius: 2 }}>
          <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>WEEK PTS</div>
          <div className="t-heading" style={{
            fontSize: 24, margin: '2px 0 0 0', textTransform: 'none', letterSpacing: 0,
            color: accent,
          }}>+{weekPoints}</div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--off-white-07)', borderRadius: 2 }}>
          <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em' }}>TOTAL PTS</div>
          <div className="t-heading" style={{
            fontSize: 24, margin: '2px 0 0 0', textTransform: 'none', letterSpacing: 0,
            color: 'var(--off-white)',
          }}>{user.points}</div>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ padding: '10px 12px', background: 'var(--off-white-07)', borderRadius: 2 }}>
        <div className="t-mono" style={{ fontSize: 8, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6 }}>
          DAILY BREAKDOWN · FRI → THU
        </div>
        <EowSparkline breakdown={breakdown} accent={accent} />
      </div>

      {/* Share */}
      <button onClick={() => onShare(entry, cohort, weekNumber, win)} style={{
        width: '100%', padding: '10px 12px',
        background: rank === 1 ? accent : 'transparent',
        border: '1px solid ' + accent, borderRadius: 2,
        color: rank === 1 ? 'var(--deep-black)' : accent, cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 700,
      }}>
        <i className="fa-brands fa-linkedin" style={{ marginRight: 6 }} />
        GENERATE SHARE CARD
      </button>
    </div>
  );
}

// ============================================================================
// Cohort section — headline + Top 3 cards.
// ============================================================================
function EowCohortSection({ cohort, winners, weekNumber, window: win, onShare }) {
  const accent = cohort.status === 'active' ? 'var(--lime)'
               : cohort.status === 'upcoming' ? 'var(--sky)'
               : 'var(--lavender)';

  const hasWinners = winners.length > 0;

  return (
    <div className="card-panel" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            {(cohort.status || '').toUpperCase()} · {cohort.code || cohort.id.toUpperCase()}
          </div>
          <h2 className="t-heading" style={{
            fontSize: 24, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--off-white)',
          }}>{cohort.name}</h2>
          <div className="t-body" style={{ marginTop: 4, fontSize: 12, color: 'var(--off-white-68)' }}>
            Top 3 Exonauts for the Fri→Thu window closing {EOW.formatMMMDD(win.endThu)}.
          </div>
        </div>
      </div>

      {hasWinners ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {winners.map(w => (
            <EowWinnerCard key={w.user.id} entry={w} cohort={cohort} weekNumber={weekNumber} window={win} onShare={onShare} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: 28, background: 'var(--off-white-07)', borderRadius: 2, textAlign: 'center',
        }}>
          <div className="t-body" style={{ color: 'var(--off-white-40)', fontSize: 12 }}>
            No Exonauts in this cohort yet.
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Share card modal — LinkedIn-ready 1200×630 poster with download.
// ============================================================================
function EowShareModal({ entry, cohort, weekNumber, window: win, onClose }) {
  const { user, rank, weekPoints, breakdown } = entry;
  const track = TRACKS.find(t => t.code === getUserTrack(user.id));
  const svgRef = React.useRef(null);

  const medal = rank === 1 ? '#F4C542' : rank === 2 ? '#B8C2CE' : '#CD7F32';
  const medalLabel = rank === 1 ? 'EXONAUT OF THE WEEK' : rank === 2 ? 'TOP 3 · #2 RUNNER-UP' : 'TOP 3 · #3 RUNNER-UP';
  const accent = rank === 1 ? '#C9F24A' : '#7FE3FF';

  const initials = user.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  function downloadSVG() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const src = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exonaut-of-the-week-${user.name.replace(/\s+/g, '-').toLowerCase()}-w${weekNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const src = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 630;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 1200, 630);
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exonaut-of-the-week-${user.name.replace(/\s+/g, '-').toLowerCase()}-w${weekNumber}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(blob);
  }

  // LinkedIn share-intent (the user's chosen text is copied; image is downloaded).
  const shareText =
`Honored to be recognized as ${rank === 1 ? 'Exonaut of the Week' : 'Top 3 this week'} in the Exoasia ${cohort.name} cohort — ${track?.name || ''} track.

+${weekPoints} points logged between ${win.label}. Week ${weekNumber} of ${COHORT?.weekTotal || 12}. Onward.

#Exoasia #ExonautProgram #${(track?.short || '').replace(/[^A-Z0-9]/gi, '')}`;

  function copyCopy() {
    try { navigator.clipboard.writeText(shareText); } catch (e) {}
  }

  function openLinkedIn() {
    // LinkedIn's feed share route — image needs to be uploaded separately.
    const url = 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const max = Math.max(1, ...breakdown.map(d => d.points));

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card-panel" style={{
        width: 'min(980px, 100%)', padding: 0, borderColor: accent,
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--off-white-07)', position: 'relative' }}>
          <div className="t-mono" style={{ fontSize: 9, color: accent, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            LINKEDIN SHARE CARD · 1200 × 630
          </div>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>{user.name} — {medalLabel}</h2>
          <div className="t-body" style={{ fontSize: 12, color: 'var(--off-white-68)', marginTop: 4 }}>
            Download the card, then use Share to LinkedIn. The copy below is pre-filled.
          </div>
          <div onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--off-white-40)',
          }}><i className="fa-solid fa-xmark" /></div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* SVG preview */}
          <div style={{
            width: '100%', aspectRatio: '1200 / 630',
            background: '#0A0D11', border: '1px solid var(--off-white-15)', borderRadius: 2,
            overflow: 'hidden',
          }}>
            <svg
              ref={svgRef}
              viewBox="0 0 1200 630" width="100%" height="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0A0D11" />
                  <stop offset="100%" stopColor="#161B22" />
                </linearGradient>
                <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={accent} stopOpacity="1" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={accent} strokeOpacity="0.05" strokeWidth="1" />
                </pattern>
              </defs>

              {/* background */}
              <rect width="1200" height="630" fill="url(#bg)" />
              <rect width="1200" height="630" fill="url(#grid)" />

              {/* accent beam */}
              <rect x="0" y="0" width="1200" height="6" fill={accent} />
              <rect x="0" y="624" width="1200" height="6" fill={medal} />

              {/* top bar — EXOASIA */}
              <text x="60" y="70" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="18" fill={accent} letterSpacing="6">
                EXOASIA · EXONAUT PROGRAM
              </text>
              <text x="60" y="95" fontFamily="JetBrains Mono, monospace" fontSize="13" fill="#B8C2CE" letterSpacing="2">
                {cohort.code || cohort.id.toUpperCase()} · WEEK {String(weekNumber).padStart(2,'0')} · {win.label}
              </text>

              {/* big rank badge, top right */}
              <circle cx="1080" cy="110" r="58" fill="none" stroke={medal} strokeWidth="3" />
              <circle cx="1080" cy="110" r="44" fill={medal} fillOpacity="0.12" />
              <text x="1080" y="105" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="38" fill={medal}>
                #{rank}
              </text>
              <text x="1080" y="128" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={medal} letterSpacing="2">
                {rank === 1 ? 'GOLD' : rank === 2 ? 'SILVER' : 'BRONZE'}
              </text>

              {/* headline */}
              <text x="60" y="230" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="72" fill="#F5F2ED" letterSpacing="-1">
                {rank === 1 ? 'EXONAUT' : 'TOP 3'}
              </text>
              <text x="60" y="310" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="72" fill={accent} letterSpacing="-1">
                {rank === 1 ? 'OF THE WEEK' : 'THIS WEEK'}
              </text>

              {/* avatar ring */}
              <circle cx="160" cy="470" r="72" fill="none" stroke={accent} strokeWidth="3" />
              <circle cx="160" cy="470" r="62" fill={accent} fillOpacity="0.15" />
              <text x="160" y="492" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="48" fill={accent}>
                {initials}
              </text>

              {/* identity + stats */}
              <text x="265" y="440" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="34" fill="#F5F2ED">
                {user.name.length > 24 ? user.name.slice(0, 22) + '…' : user.name}
              </text>
              <text x="265" y="475" fontFamily="JetBrains Mono, monospace" fontSize="14" fill="#B8C2CE" letterSpacing="2">
                {track?.short || ''} · {track?.name || ''}
              </text>

              {/* big points */}
              <text x="265" y="545" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="54" fill={accent}>
                +{weekPoints}
              </text>
              <text x="265" y="572" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#B8C2CE" letterSpacing="2">
                POINTS · WEEK {String(weekNumber).padStart(2,'0')}
              </text>

              {/* daily sparkline at right */}
              {breakdown.map((d, i) => {
                const barH = Math.max(4, Math.round((d.points / max) * 140));
                const x = 720 + i * 60;
                const y = 530 - barH;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={44} height={barH} fill={accent} opacity={d.points === 0 ? 0.25 : 1} />
                    <text x={x + 22} y={555} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#B8C2CE" letterSpacing="1">
                      {d.day}
                    </text>
                    <text x={x + 22} y={y - 6} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="700" fontSize="11" fill="#F5F2ED">
                      {d.points}
                    </text>
                  </g>
                );
              })}
              <text x="720" y="405" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#B8C2CE" letterSpacing="2">
                DAILY · FRI → THU
              </text>

              {/* footer */}
              <text x="60" y="605" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#858C94" letterSpacing="2">
                EXOASIA.COM · MISSION-DRIVEN VENTURE BUILDING
              </text>
            </svg>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button onClick={downloadPNG} style={{
              padding: '10px 12px', background: accent, border: 'none', borderRadius: 2,
              color: 'var(--deep-black)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
            }}>
              <i className="fa-solid fa-download" style={{ marginRight: 6 }} />
              DOWNLOAD PNG
            </button>
            <button onClick={downloadSVG} style={{
              padding: '10px 12px', background: 'transparent', border: '1px solid var(--off-white-15)', borderRadius: 2,
              color: 'var(--off-white)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
            }}>
              <i className="fa-solid fa-file-code" style={{ marginRight: 6 }} />
              DOWNLOAD SVG
            </button>
            <button onClick={openLinkedIn} style={{
              padding: '10px 12px', background: '#0A66C2', border: 'none', borderRadius: 2,
              color: '#FFF', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
            }}>
              <i className="fa-brands fa-linkedin" style={{ marginRight: 6 }} />
              POST TO LINKEDIN
            </button>
          </div>

          {/* Copy */}
          <div>
            <div className="t-mono" style={{ fontSize: 9, color: 'var(--off-white-40)', letterSpacing: '0.1em', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>PRE-FILLED POST COPY</span>
              <button onClick={copyCopy} style={{
                background: 'transparent', border: 'none', color: accent, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 700,
              }}>
                <i className="fa-solid fa-copy" style={{ marginRight: 4 }} />COPY
              </button>
            </div>
            <textarea readOnly value={shareText} style={{
              width: '100%', minHeight: 100, resize: 'vertical',
              padding: '10px 12px',
              background: 'var(--deep-black)', color: 'var(--off-white)',
              border: '1px solid var(--off-white-15)', borderRadius: 2,
              fontFamily: 'var(--font-display)', fontSize: 12, outline: 'none', lineHeight: 1.5,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CommanderEOW page — top-level.
// ============================================================================
function CommanderEOW() {
  const { all, cohortId } = useCohort();
  const [weekNumber, setWeekNumber] = React.useState(() => EOW.currentWeek());
  const [share, setShare] = React.useState(null);   // { entry, cohort, weekNumber, window }
  const selectedCohort = all.find(c => c.id === cohortId) || all[0] || (typeof COHORT !== 'undefined' ? COHORT : null);
  const totalWeeks = window.getCohortWeekTotal?.(selectedCohort) || (typeof COHORT !== 'undefined' ? COHORT.weekTotal : 12) || 12;

  // Show all cohorts — but float the Commander's currently-selected cohort to the top.
  const cohorts = [...all].sort((a, b) => {
    if (a.id === cohortId) return -1;
    if (b.id === cohortId) return 1;
    // Active > upcoming > alumni
    const rank = { active: 0, upcoming: 1, alumni: 2 };
    return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
  });

  const activeCohortWin = EOW.weekWindow(cohorts[0], weekNumber);
  const anyWinners = cohorts.some(c => EOW.topOfWeek(c.id, weekNumber, 1).length > 0);

  return (
    <div className="enter">
      <div className="section-head">
        <div>
          <div className="t-label" style={{ marginBottom: 8, color: 'var(--amber, #F4C542)' }}>
            COMMANDER · EXONAUT OF THE WEEK
          </div>
          <h1 className="t-title" style={{ fontSize: 40, margin: 0 }}>Weekly Honors</h1>
          <div className="t-body" style={{ marginTop: 6 }}>
            Top 3 Exonauts per cohort, computed from points earned Fri → Thu. Generate LinkedIn-ready share cards for each winner.
          </div>
        </div>
        <EowWeekStepper
          weekNumber={weekNumber}
          totalWeeks={totalWeeks}
          onChange={setWeekNumber}
          window={activeCohortWin}
        />
      </div>

      {/* Window summary strip */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        <EowDatePill label="WINDOW OPENS" value={EOW.formatMMMDD(activeCohortWin.startFri) + ' · FRI 00:00'} accent="var(--lime)" />
        <EowDatePill label="WINDOW CLOSES" value={EOW.formatMMMDD(activeCohortWin.endThu) + ' · THU 23:59'} accent="var(--sky)" />
        <EowDatePill label="COHORTS ON PLATFORM" value={String(cohorts.length)} />
        <EowDatePill label="WINNERS COMPUTED" value={cohorts.reduce((s, c) => s + EOW.topOfWeek(c.id, weekNumber, 3).length, 0) + ' TOTAL'} />
      </div>

      {!anyWinners && (
        <div className="card-panel" style={{ textAlign: 'center', padding: 48 }}>
          <i className="fa-solid fa-trophy" style={{ fontSize: 32, color: 'var(--off-white-40)', marginBottom: 12 }} />
          <div className="t-body" style={{ color: 'var(--off-white-68)' }}>
            No Exonauts in any cohort yet. Use Platform Admin → Exonaut Assignment to add members.
          </div>
        </div>
      )}

      {cohorts.map(c => {
        const winners = EOW.topOfWeek(c.id, weekNumber, 3);
        const win = EOW.weekWindow(c, weekNumber);
        return (
          <EowCohortSection
            key={c.id}
            cohort={c}
            winners={winners}
            weekNumber={weekNumber}
            window={win}
            onShare={(entry, cohort, wn, w) => setShare({ entry, cohort, weekNumber: wn, window: w })}
          />
        );
      })}

      {share && (
        <EowShareModal
          entry={share.entry}
          cohort={share.cohort}
          weekNumber={share.weekNumber}
          window={share.window}
          onClose={() => setShare(null)}
        />
      )}
    </div>
  );
}

Object.assign(window, { CommanderEOW, EowShareModal });
