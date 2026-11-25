'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ScheduleDirectory } from '@/types/scheduleManagement';

const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function ScheduleCourseSelector({ directory, assignmentId, initialGroupId = '', initialComponentId = '', canAssign, onChange, onAssign }: {
  directory: ScheduleDirectory; assignmentId: string; initialGroupId?: string; initialComponentId?: string; canAssign: boolean;
  onChange: (id: string) => void; onAssign: (context: { groupId: string; offeringId: string; componentId: string }) => void;
}) {
  const selected = directory.assignments.find(row => row.id === assignmentId);
  const initialComponent = directory.components.find(row => row.id === initialComponentId);
  const relatedGroups = initialComponent ? directory.groups.filter(group => group.offeringIds.some(id => directory.offerings.some(offering => offering.id === id && offering.curriculumId === initialComponent.curriculumId))) : [];
  const [groupId, setGroupId] = useState(selected?.groupId || initialGroupId || (relatedGroups.length === 1 ? relatedGroups[0].id : ''));
  const [componentId, setComponent] = useState(selected?.componentId || initialComponentId);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const group = directory.groups.find(row => row.id === groupId);
  const offerings = directory.offerings.filter(row => group?.offeringIds.includes(row.id));
  const components = directory.components.filter(row => offerings.some(o => o.curriculumId === row.curriculumId));
  const normSubjectQuery = normalizeSearch(subjectQuery);
  const filteredComponents = normSubjectQuery
    ? components.filter(row => row.id === componentId || normalizeSearch(row.label).includes(normSubjectQuery))
    : components;
  const component = components.find(row => row.id === componentId);
  const offering = (component ? offerings.find(row => row.curriculumId === component.curriculumId) : undefined)
    || offerings.find(row => directory.components.some(c => c.curriculumId === row.curriculumId))
    || offerings[0];
  const assignments = directory.assignments.filter(row => row.groupId === groupId && (!offering || row.offeringId === offering.id || offerings.some(o => o.id === row.offeringId)) && row.componentId === component?.id && directory.teachers.some(teacher => teacher.id === row.teacherId && teacher.active));
  const normTeacherQuery = normalizeSearch(teacherQuery);
  const filteredAssignments = normTeacherQuery
    ? assignments.filter(row => {
        if (row.id === assignmentId) return true;
        const tName = directory.teachers.find(teacher => teacher.id === row.teacherId)?.name || '';
        return normalizeSearch(tName).includes(normTeacherQuery);
      })
    : assignments;
  return <fieldset><legend>Quel cours programmer ?</legend><p>Choisissez la classe (groupe), sa matière et l’enseignant, puis renseignez le créneau ou la semaine ci-dessous.</p>
    <label className="form-group">Groupe du cours<select aria-label="Groupe du cours" className="select-input" required value={groupId} onChange={event => { setGroupId(event.target.value); setComponent(''); setSubjectQuery(''); setTeacherQuery(''); onChange(''); }}><option value="">Choisir un groupe</option>{directory.groups.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    <div className="btn-group mb-1">
      <Link className="btn btn-sm btn-outline" href="/academique/referentiel?collection=groups">Créer ou gérer une classe / un groupe →</Link>
      <Link className="btn btn-sm btn-outline" href="/academique/referentiel?collection=group_offerings">Rattacher une classe à une formation →</Link>
    </div>
    <div className="form-group">
      <label className="form-label" htmlFor="schedule-single-subject-select">Matière du cours</label>
      <input
        type="search"
        aria-label="Rechercher une matière"
        className="input mb-1"
        placeholder="Rechercher une matière par nom ou code…"
        disabled={!group}
        value={subjectQuery}
        onChange={event => {
          const nextQuery = event.target.value;
          setSubjectQuery(nextQuery);
          const norm = normalizeSearch(nextQuery);
          if (norm) {
            const match = components.find(row => normalizeSearch(row.label).includes(norm));
            if (match && match.id !== componentId) {
              setComponent(match.id);
              const nextAss = directory.assignments.filter(row => row.groupId === groupId && row.componentId === match.id && directory.teachers.some(t => t.id === row.teacherId && t.active));
              onChange(nextAss.length === 1 ? nextAss[0].id : '');
            }
          }
        }}
      />
      <select id="schedule-single-subject-select" aria-label="Matière du cours" className="select-input" required disabled={!group} value={component?.id || ''} onChange={event => {
        const nextCompId = event.target.value;
        setComponent(nextCompId);
        const nextAss = directory.assignments.filter(row => row.groupId === groupId && row.componentId === nextCompId && directory.teachers.some(t => t.id === row.teacherId && t.active));
        onChange(nextAss.length === 1 ? nextAss[0].id : '');
      }}><option value="">Choisir une matière</option>{filteredComponents.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select>
    </div>
    {group && !components.length && <p>Aucune matière disponible pour ce groupe. <Link href="/academique/filieres">Compléter son programme de cours</Link>.</p>}
    <div className="form-group">
      <label className="form-label" htmlFor="schedule-single-teacher-select">Enseignant du cours</label>
      <input
        type="search"
        aria-label="Rechercher un enseignant"
        className="input mb-1"
        placeholder="Rechercher un enseignant par nom…"
        disabled={!component || !assignments.length}
        value={teacherQuery}
        onChange={event => {
          const nextQuery = event.target.value;
          setTeacherQuery(nextQuery);
          const norm = normalizeSearch(nextQuery);
          if (norm) {
            const match = assignments.find(row => normalizeSearch(directory.teachers.find(t => t.id === row.teacherId)?.name || '').includes(norm));
            if (match && match.id !== assignmentId) onChange(match.id);
          }
        }}
      />
      <select id="schedule-single-teacher-select" aria-label="Enseignant du cours" className="select-input" required disabled={!component || !assignments.length} value={assignmentId} onChange={event => onChange(event.target.value)}><option value="">Choisir l’enseignant</option>{filteredAssignments.map(row => <option key={row.id} value={row.id}>{directory.teachers.find(teacher => teacher.id === row.teacherId)?.name} · du {row.validFrom}{row.validUntil ? ` au ${row.validUntil}` : ', sans date de fin'}</option>)}</select>
    </div>
    {component && !assignments.length && <p>Aucun enseignant n’est encore affecté à cette matière pour ce groupe.</p>}
    <div className="btn-group">
      {component && offering && canAssign && <button type="button" className="btn btn-outline" onClick={() => onAssign({ groupId, offeringId: offering.id, componentId: component.id })}>Affecter un enseignant ici</button>}
      <Link className="btn btn-sm btn-outline" href="/personnel/enseignants">Enseignants & affectations →</Link>
    </div>
    {!directory.groups.length && <p>Aucun groupe disponible. <Link href="/academique/referentiel?collection=groups">Créer une classe / un groupe</Link> ou préparez les formations dans « Année scolaire ».</p>}
  </fieldset>;
}
