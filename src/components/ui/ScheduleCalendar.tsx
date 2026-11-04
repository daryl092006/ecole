'use client';

import { useState } from 'react';
import SecondaryDetails from './SecondaryDetails';

export interface CalendarSession {
  id: string;
  start: string;
  end: string;
  title: string;
  subtitle: string;
  subject?: string;
  group?: string;
  teacher?: string;
  room?: string;
  status?: string;
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(str: string): Date {
  const [y, m, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function ScheduleCalendar({
  sessions,
  onSelect,
  period,
}: {
  sessions: CalendarSession[];
  onSelect: (id: string) => void;
  period?: { id: string; starts_on: string; ends_on: string };
}) {
  const validPeriod =
    !period ||
    (/^\d{4}-\d{2}-\d{2}$/.test(period.starts_on) &&
      /^\d{4}-\d{2}-\d{2}$/.test(period.ends_on) &&
      period.starts_on <= period.ends_on);

  const inPeriod = (date: string) => !period || (date >= period.starts_on && date <= period.ends_on);

  const invalid = sessions.filter(
    row => !/^\d{4}-\d{2}-\d{2}/.test(row.start) || Number.isNaN(Date.parse(row.start))
  );

  const dated = sessions
    .filter(row => /^\d{4}-\d{2}-\d{2}/.test(row.start) && !Number.isNaN(Date.parse(row.start)))
    .filter(row => inPeriod(row.start.slice(0, 10)))
    .sort((a, b) => a.start.localeCompare(b.start));

  const now = new Date();
  const todayStr = formatIsoDate(now);

  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week');

  // Month-view state
  const lower = period?.starts_on.slice(0, 7);
  const upper = period?.ends_on.slice(0, 7);
  const clampMonth = (m: string) => (lower && m < lower ? lower : upper && m > upper ? upper : m);

  // Week-view state
  // Initial date for week: first session date if exists, or today if in period, or period starts_on
  const defaultDateStr =
    dated[0]?.start.slice(0, 10) ||
    (inPeriod(todayStr) ? todayStr : period?.starts_on || todayStr);

  const [currentWeekMondayStr, setCurrentWeekMondayStr] = useState<string>(() => {
    return formatIsoDate(getMonday(parseIsoDate(defaultDateStr)));
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return clampMonth(defaultDateStr.slice(0, 7));
  });

  if (!validPeriod) {
    return (
      <section className="card" role="alert">
        Les dates de cette année doivent être renseignées pour afficher son calendrier.
      </section>
    );
  }

  // --- Week View Calculations ---
  const currentMonday = parseIsoDate(currentWeekMondayStr);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    return {
      index: i,
      name: DAY_NAMES[i],
      dateStr: formatIsoDate(d),
      dateObj: d,
      isToday: formatIsoDate(d) === todayStr,
    };
  });

  // Check if Sunday has any session; if not, we show Monday - Saturday (standard university week)
  const sundayHasSessions = dated.some(s => s.start.slice(0, 10) === weekDays[6].dateStr);
  const visibleDays = sundayHasSessions ? weekDays : weekDays.slice(0, 6);

  // Filter sessions in the current week
  const weekStart = weekDays[0].dateStr;
  const weekEnd = weekDays[visibleDays.length - 1].dateStr;
  const weekSessions = dated.filter(s => {
    const d = s.start.slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });

  // Extract distinct time slots for the week, or standard university slots if none
  const distinctSlots = Array.from(
    new Set(
      weekSessions.map(s => {
        const startH = s.start.slice(11, 16);
        const endH = s.end ? s.end.slice(11, 16) : '';
        return endH ? `${startH} – ${endH}` : startH;
      })
    )
  ).sort((a, b) => a.localeCompare(b));

  const standardSlots = ['07:30 – 09:30', '10:00 – 12:00', '12:30 – 14:30', '15:00 – 17:00'];
  const displaySlots = distinctSlots.length > 0 ? distinctSlots : standardSlots;

  const moveWeek = (delta: number) => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + delta * 7);
    setCurrentWeekMondayStr(formatIsoDate(next));
    setSelectedMonth(clampMonth(formatIsoDate(next).slice(0, 7)));
  };

  const jumpToToday = () => {
    const todayMonday = getMonday(now);
    setCurrentWeekMondayStr(formatIsoDate(todayMonday));
    setSelectedMonth(clampMonth(todayStr.slice(0, 7)));
  };

  const jumpToDate = (targetDate: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      const targetMonday = getMonday(parseIsoDate(targetDate));
      setCurrentWeekMondayStr(formatIsoDate(targetMonday));
      setSelectedMonth(clampMonth(targetDate.slice(0, 7)));
    }
  };

  // --- Month View Calculations ---
  const [year, month] = selectedMonth.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthOffset = (firstOfMonth.getDay() + 6) % 7;

  const moveMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(clampMonth(mStr));
  };

  // Helper to extract session details
  const renderSessionCard = (session: CalendarSession) => {
    const subject = session.subject || session.title.split(' · ')[0] || session.title;
    const group = session.group || (session.title.includes(' · ') ? session.title.split(' · ')[1] : '');
    const teacher = session.teacher || (session.subtitle.includes(' · ') ? session.subtitle.split(' · ')[0] : session.subtitle);
    const room = session.room || (session.subtitle.includes(' · ') ? session.subtitle.split(' · ')[1] : '');
    const timeDisplay = `${session.start.slice(11, 16)}${session.end ? ` – ${session.end.slice(11, 16)}` : ''}`;

    return (
      <button
        key={session.id}
        type="button"
        className="timetable-card"
        onClick={() => onSelect(session.id)}
        aria-label={`Séance ${subject} à ${timeDisplay}`}
      >
        <span className="timetable-card-subject">{subject}</span>
        <div className="timetable-card-tags">
          {group && <span className="timetable-pill-group">{group}</span>}
          {room && <span className="timetable-pill-room">{room}</span>}
        </div>
        {teacher && <span className="timetable-card-teacher">{teacher}</span>}
        <span className="timetable-card-time">{timeDisplay}</span>
      </button>
    );
  };

  return (
    <section className="card">
      {/* TOOLBAR */}
      <div className="timetable-toolbar">
        <div className="timetable-nav-controls">
          {viewMode === 'week' ? (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveWeek(-1)}
                aria-label="Semaine précédente"
              >
                ← Semaine
              </button>
              <h2 className="timetable-week-header">
                Semaine du {currentMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{' '}
                au{' '}
                {new Date(currentMonday.getTime() + (visibleDays.length - 1) * 86400000).toLocaleDateString(
                  'fr-FR',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )}
              </h2>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => moveWeek(1)}
                aria-label="Semaine suivante"
              >
                Semaine →
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!inPeriod(todayStr)}
                onClick={jumpToToday}
              >
                Aujourd’hui
              </button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span>Aller au :</span>
                <input
                  className="input"
                  type="date"
                  min={period?.starts_on}
                  max={period?.ends_on}
                  value={currentWeekMondayStr}
                  onChange={e => jumpToDate(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!!lower && selectedMonth <= lower}
                onClick={() => moveMonth(-1)}
                aria-label="Mois précédent"
              >
                ← Mois
              </button>
              <h2 className="timetable-week-header">
                {firstOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!!upper && selectedMonth >= upper}
                onClick={() => moveMonth(1)}
                aria-label="Mois suivant"
              >
                Mois →
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!inPeriod(todayStr)}
                onClick={() => setSelectedMonth(clampMonth(todayStr.slice(0, 7)))}
              >
                Aujourd’hui
              </button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <span>Mois :</span>
                <input
                  className="input"
                  type="month"
                  min={lower}
                  max={upper}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(clampMonth(e.target.value))}
                />
              </label>
            </>
          )}
        </div>

        {/* View Switcher: Semaine / Mois / Liste */}
        <div className="timetable-view-switcher" role="radiogroup" aria-label="Mode d'affichage">
          <button
            type="button"
            className={`timetable-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            role="radio"
            aria-checked={viewMode === 'week'}
          >
            Semaine (Grille)
          </button>
          <button
            type="button"
            className={`timetable-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            role="radio"
            aria-checked={viewMode === 'month'}
          >
            Mois
          </button>
          <button
            type="button"
            className={`timetable-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            role="radio"
            aria-checked={viewMode === 'list'}
          >
            Liste
          </button>
        </div>
      </div>

      {/* VIEW 1: VUE SEMAINE GRILLE UNIVERSITAIRE */}
      {viewMode === 'week' && (
        <>
          {/* Desktop & Tablet Table */}
          <div className="timetable-scroll" role="region" aria-label="Emploi du temps hebdomadaire">
            <table className="timetable-grid">
              <thead>
                <tr>
                  <th className="time-col-header" scope="col">
                    Créneaux
                  </th>
                  {visibleDays.map(day => (
                    <th
                      key={day.dateStr}
                      className={`day-col-header ${day.isToday ? 'is-today' : ''}`}
                      scope="col"
                    >
                      <span className="day-title">{day.name}</span>
                      <span className="day-subtitle">
                        {day.dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displaySlots.map(slot => {
                  const slotStartH = slot.split(' – ')[0]?.trim();
                  return (
                    <tr key={slot}>
                      <td className="time-cell">{slot}</td>
                      {visibleDays.map(day => {
                        const cellSessions = weekSessions.filter(s => {
                          if (s.start.slice(0, 10) !== day.dateStr) return false;
                          const sSlot = `${s.start.slice(11, 16)} – ${s.end ? s.end.slice(11, 16) : ''}`.trim();
                          if (distinctSlots.length > 0) {
                            return sSlot === slot;
                          }
                          // Fallback to slot start hour
                          return s.start.slice(11, 16) === slotStartH;
                        });

                        return (
                          <td
                            key={day.dateStr}
                            className={`slot-cell ${day.isToday ? 'is-today' : ''} ${
                              cellSessions.length === 0 ? 'is-empty' : ''
                            }`}
                          >
                            {cellSessions.map(renderSessionCard)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (max-width: 768px) */}
          <div className="timetable-mobile-days" aria-label="Séances de la semaine">
            {visibleDays.map(day => {
              const daySessions = weekSessions.filter(s => s.start.slice(0, 10) === day.dateStr);
              return (
                <article key={day.dateStr} className="timetable-mobile-day">
                  <h3 className="timetable-mobile-day-title">
                    {day.name}{' '}
                    {day.dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {day.isToday && ' (Aujourd’hui)'}
                  </h3>
                  <div className="timetable-mobile-day-body">
                    {daySessions.length > 0 ? (
                      daySessions.map(renderSessionCard)
                    ) : (
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.35rem 0' }}>
                        Aucun cours programmé ce jour.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {weekSessions.length === 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              Aucun cours pour cette semaine. Utilisez les boutons « Semaine » ou le sélecteur pour parcourir l’emploi du temps.
            </p>
          )}
        </>
      )}

      {/* VIEW 2: VUE MOIS */}
      {viewMode === 'month' && (
        <div className="schedule-calendar-scroll">
          <div className="schedule-calendar" aria-label="Calendrier mensuel">
            {DAY_NAMES.map(day => (
              <strong className="calendar-weekday" key={day}>
                {day}
              </strong>
            ))}
            {Array.from({ length: monthOffset }, (_, i) => (
              <div className="calendar-day calendar-outside" key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
              if (!inPeriod(date)) return <div className="calendar-day calendar-outside" key={date} />;
              const daySessions = dated.filter(row => row.start.slice(0, 10) === date);
              return (
                <section className="calendar-day" key={date} aria-label={date}>
                  <time dateTime={date}>{i + 1}</time>
                  {daySessions.map(renderSessionCard)}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: VUE LISTE */}
      {viewMode === 'list' && (
        <div className="schedule-calendar-list" style={{ display: 'grid' }} role="region" aria-label="Liste des cours">
          {Array.from({ length: daysInMonth }, (_, index) => `${selectedMonth}-${String(index + 1).padStart(2, '0')}`)
            .filter(date => dated.some(row => row.start.slice(0, 10) === date))
            .map(date => (
              <section className="calendar-list-day" key={date}>
                <h3>
                  <time dateTime={date}>
                    {parseIsoDate(date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </time>
                </h3>
                {dated
                  .filter(row => row.start.slice(0, 10) === date)
                  .map(renderSessionCard)}
              </section>
            ))}
          {!dated.some(row => row.start.slice(0, 7) === selectedMonth) && (
            <p>Aucune séance pour ce mois.</p>
          )}
        </div>
      )}

      {!dated.length && <p>Aucune séance datée pour ces filtres.</p>}

      {invalid.length > 0 && (
        <SecondaryDetails title={`Séances sans date valide (${invalid.length})`}>
          {invalid.map(row => (
            <button className="btn btn-outline" key={row.id} onClick={() => onSelect(row.id)}>
              {row.title} · Date à vérifier
            </button>
          ))}
        </SecondaryDetails>
      )}
    </section>
  );
}
