'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, FileText, GraduationCap, HelpCircle, MapPin, Megaphone, Wallet } from 'lucide-react';
import { usePortal } from '@/hooks/usePortal';
import { enrollmentParticipates } from '@/services/sessionParticipantsService';
import type { DatabaseRow } from '@/types/persistence';

const money = (amount: number) => `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
const date = (value: string) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const time = (value: unknown) => new Date(String(value)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function StudentHome() {
  const portal = usePortal();
  const snapshot = portal.relationalSnapshot;
  const rows = (table: string) => (snapshot.tables[table] || []).filter(row => !row.archived_at);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const me = portal.students.find(student => student.matricule === portal.session?.matricule);
  const studentRow = rows('students').find(student => student.id === portal.session?.studentId || student.matricule === portal.session?.matricule);
  const enrollments = rows('enrollments').filter(row => row.student_id === studentRow?.id && ['INSCRIT', 'REINSCRIT'].includes(String(row.status)));
  const pages = portal.availableTabs.flatMap(tab => tab.subTabs || []);
  const page = (id: string) => pages.find(item => item.id === id);
  const firstName = me?.firstname || portal.session?.name?.split(/\s+/)[0] || '';
  const year = portal.academicYearContext?.years.find(item => item.id === portal.academicYearContext?.selectedYearId);
  const financials = me?.financials;
  const hasFinance = financials?.available === true;
  const schedulePage = page('acad_schedule');
  const sessions = now === null ? [] : rows('sessions').filter(session => {
    if (['ANNULE', 'REPORTE'].includes(String(session.status)) || !Number.isFinite(Date.parse(String(session.starts_at))) || !Number.isFinite(Date.parse(String(session.ends_at))) || Date.parse(String(session.ends_at)) <= now) return false;
    const participants = rows('session_participants').filter(row => row.session_id === session.id);
    return (participants.length ? participants : [session]).some(participant => enrollments.some(enrollment => enrollmentParticipates(snapshot, session, participant, enrollment.id)));
  }).sort((a, b) => Date.parse(String(a.starts_at)) - Date.parse(String(b.starts_at)));
  const next = sessions[0];
  const courseName = (session: DatabaseRow) => {
    const assignment = rows('teaching_assignments').find(row => row.id === session.assignment_id);
    const component = rows('curriculum_components').find(row => row.id === (session.component_id || assignment?.component_id));
    const subject = rows('subjects').find(row => row.id === (session.subject_id || component?.subject_id));
    return String(subject?.name || 'Séance de cours');
  };
  const roomName = (session: DatabaseRow) => {
    if (session.mode === 'EN_LIGNE') return 'En ligne';
    const room = rows('rooms').find(row => row.id === (session.actual_room_id || session.room_id));
    return room ? String(room.name || room.code) : 'Salle à confirmer';
  };
  const shortcuts = [
    { id: 'acad_schedule', title: 'Mon emploi du temps', detail: 'Horaires, salles et séances', icon: CalendarDays },
    { id: 'acad_resources', title: 'Mes supports de cours', detail: 'Documents et enregistrements', icon: BookOpen },
    { id: 'acad_grades', title: 'Mes notes et résultats', detail: 'Consulter mes résultats publiés', icon: GraduationCap },
    { id: 'espace_exams', title: 'Mes épreuves en ligne', detail: 'Accéder à mes épreuves', icon: ClipboardCheck },
  ].flatMap(item => { const destination = page(item.id); return destination ? [{ ...item, href: destination.href }] : []; });
  const services = [
    { id: 'espace_documents', title: 'Mes documents', detail: 'Déposer et suivre mes pièces', icon: FileText },
    { id: 'espace_attendance', title: 'Mon assiduité', detail: 'Consulter mes présences et absences', icon: ClipboardCheck },
    { id: 'espace_support', title: 'Besoin d’aide ?', detail: 'Contacter le support technique', icon: HelpCircle },
  ].flatMap(item => { const destination = page(item.id); return destination ? [{ ...item, href: destination.href }] : []; });
  const newsPage = page('espace_announcements');
  const announcements = rows('communications').filter(row => {
    const published = Date.parse(String(row.published_at));
    return now !== null && Number.isFinite(published) && published <= now && !row.withdrawn_at && (!row.expires_at || Date.parse(String(row.expires_at)) > now);
  }).sort((a, b) => Date.parse(String(b.published_at)) - Date.parse(String(a.published_at))).slice(0, 2);

  return <div className="student-home">
    <header className="student-welcome">
      <div className="student-welcome-copy">
        <span className="student-eyebrow">MON ESPACE ÉTUDIANT{year ? ` · ${year.name}` : ''}</span>
        <h1>Bonjour{firstName ? ` ${firstName}` : ''}.</h1>
        <p>Votre journée, vos cours et vos démarches, au même endroit.</p>
        <div className="student-identity">
          {me?.filiere && <span><GraduationCap size={16} aria-hidden="true" />{me.filiere}</span>}
          {me?.niveau && <span>{me.niveau}</span>}
          {me?.groupe && <span>{me.groupe}</span>}
        </div>
      </div>
      {page('espace_profile') && <Link href={page('espace_profile')!.href} className="student-profile-link">Mon profil<ArrowRight size={16} aria-hidden="true" /></Link>}
    </header>

    <div className="student-home-grid">
      <div className="student-home-main">
        {schedulePage && <section className="student-panel" aria-labelledby="student-agenda-title">
          <div className="student-panel-heading"><div><span className="student-eyebrow">MON PLANNING</span><h2 id="student-agenda-title">Mes prochains cours</h2></div><Link href={schedulePage.href}>Tout le planning<ArrowRight size={16} aria-hidden="true" /></Link></div>
          {now === null ? <p role="status" className="student-empty">Chargement du planning…</p> : !next ? <div className="student-empty"><CalendarDays size={30} aria-hidden="true" /><h3>Aucune séance à venir</h3><p>{enrollments.length ? 'Les prochaines séances apparaîtront ici dès leur planification.' : 'Votre planning apparaîtra lorsque votre inscription et votre groupe seront confirmés pour cette année.'}</p><Link href={schedulePage.href}>Consulter mon emploi du temps<ArrowRight size={16} aria-hidden="true" /></Link></div> : <ol className="student-agenda">
            {sessions.slice(0, 3).map((session, index) => <li key={session.id} className={index === 0 ? 'student-agenda-next' : undefined}>
              <div className="student-agenda-time"><strong>{time(session.starts_at)}</strong><span>{time(session.ends_at)}</span></div>
              <div className="student-agenda-course"><span className="student-course-date">{date(String(session.starts_at))}{Date.parse(String(session.starts_at)) <= now ? ' · En cours' : index === 0 ? ' · Prochaine séance' : ''}</span><h3>{courseName(session)}</h3><span className="student-room"><MapPin size={14} aria-hidden="true" />{roomName(session)}</span></div>
              <Link href={schedulePage.href} className="student-agenda-open" aria-label={`Voir la séance : ${courseName(session)}`}><ChevronRight size={20} aria-hidden="true" /></Link>
            </li>)}
          </ol>}
        </section>}

        <nav className="student-shortcuts" aria-label="Mes accès rapides">
          {shortcuts.map(item => <Link href={item.href} key={item.id} className="student-shortcut"><span className="student-shortcut-icon"><item.icon size={22} aria-hidden="true" /></span><strong>{item.title}</strong><span>{item.detail}</span><ArrowRight className="student-shortcut-arrow" size={17} aria-hidden="true" /></Link>)}
        </nav>

        {newsPage && <section className="student-panel" aria-labelledby="student-news-title"><div className="student-panel-heading"><div><span className="student-eyebrow">VIE DU CAMPUS</span><h2 id="student-news-title">Les dernières annonces</h2></div><Link href={newsPage.href}>Toutes les annonces<ArrowRight size={16} aria-hidden="true" /></Link></div>
          {announcements.length ? <div className="student-news">{announcements.map(item => <Link href={newsPage.href} key={item.id}><span className="student-news-icon"><Megaphone size={18} aria-hidden="true" /></span><div><span className="student-course-date">{date(String(item.published_at))}</span><h3>{String(item.title)}</h3></div><ChevronRight size={18} aria-hidden="true" /></Link>)}</div> : <p className="student-empty">Aucune annonce publiée pour vous pour le moment.</p>}
        </section>}
      </div>

      <div className="student-home-side">
        {page('espace_finance') && <section className="student-panel student-finance" aria-labelledby="student-finance-title"><span className="student-shortcut-icon"><Wallet size={21} aria-hidden="true" /></span><h2 id="student-finance-title">Mes frais et paiements</h2>
          {hasFinance ? <><span className="student-finance-label">Reste à régler</span><strong className="student-finance-amount">{money(financials.remaining)}</strong><p>{financials.remaining > 0 ? 'Retrouvez le détail de vos frais, échéances et règlements.' : 'Les frais enregistrés pour cette année sont soldés.'}</p><dl className="student-finance-paid"><dt>Déjà réglé</dt><dd>{money(financials.paid)}</dd></dl></> : <p>Votre situation financière n’est pas encore disponible pour cette année.</p>}
          <Link className="btn btn-outline" href={page('espace_finance')!.href}>Voir ma situation<ArrowRight size={16} aria-hidden="true" /></Link>
        </section>}
        {!!services.length && <section className="student-panel" aria-labelledby="student-services-title"><div className="student-panel-heading"><h2 id="student-services-title">Mes démarches</h2></div><div className="student-services">{services.map(item => <Link key={item.id} href={item.href}><item.icon size={20} aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.detail}</span></div><ChevronRight size={17} aria-hidden="true" /></Link>)}</div></section>}
      </div>
    </div>
  </div>;
}
