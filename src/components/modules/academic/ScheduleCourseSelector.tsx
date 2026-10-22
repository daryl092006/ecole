'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { ScheduleDirectory } from '@/types/scheduleManagement';

export default function ScheduleCourseSelector({ directory, assignmentId, initialGroupId = '', initialComponentId = '', canAssign, onChange, onAssign }: {
  directory: ScheduleDirectory; assignmentId: string; initialGroupId?: string; initialComponentId?: string; canAssign: boolean;
  onChange: (id: string) => void; onAssign: (context: { groupId: string; offeringId: string; componentId: string }) => void;
}) {
  const selected = directory.assignments.find(row => row.id === assignmentId);
  const initialComponent = directory.components.find(row => row.id === initialComponentId);
  const relatedGroups = initialComponent ? directory.groups.filter(group => group.offeringIds.some(id => directory.offerings.some(offering => offering.id === id && offering.curriculumId === initialComponent.curriculumId))) : [];
  const [groupId, setGroupId] = useState(selected?.groupId || initialGroupId || (relatedGroups.length === 1 ? relatedGroups[0].id : ''));
  const [selectedOffering, setOffering] = useState(selected?.offeringId || '');
  const [componentId, setComponent] = useState(selected?.componentId || initialComponentId);
  const group = directory.groups.find(row => row.id === groupId);
  const offerings = directory.offerings.filter(row => group?.offeringIds.includes(row.id));
  const offering = offerings.find(row => row.id === selectedOffering) || (offerings.length === 1 ? offerings[0] : undefined);
  const components = directory.components.filter(row => row.curriculumId === offering?.curriculumId);
  const component = components.find(row => row.id === componentId);
  const assignments = directory.assignments.filter(row => row.groupId === groupId && row.offeringId === offering?.id && row.componentId === component?.id && directory.teachers.some(teacher => teacher.id === row.teacherId && teacher.active));
  return <fieldset><legend>Quel cours programmer ?</legend><p>Choisissez le groupe, sa matière et l’enseignant, puis renseignez le créneau ci-dessous.</p>
    <label className="form-group">Groupe du cours<select aria-label="Groupe du cours" className="select-input" required value={groupId} onChange={event => { setGroupId(event.target.value); setOffering(''); setComponent(''); onChange(''); }}><option value="">Choisir un groupe</option>{directory.groups.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    {offerings.length > 1 && <label className="form-group">Filière et niveau<select aria-label="Filière et niveau" className="select-input" required value={selectedOffering} onChange={event => { setOffering(event.target.value); setComponent(''); onChange(''); }}><option value="">Choisir la formation du groupe</option>{offerings.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>}
    {offering && <p className="cell-sub">{offering.label}</p>}
    <label className="form-group">Matière du cours<select aria-label="Matière du cours" className="select-input" required disabled={!offering} value={component?.id || ''} onChange={event => { setComponent(event.target.value); onChange(''); }}><option value="">Choisir une matière</option>{components.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
    {offering && !components.length && <p>Aucune matière disponible pour cette formation. <Link href="/academique/filieres">Compléter son programme de cours</Link>.</p>}
    <label className="form-group">Enseignant du cours<select aria-label="Enseignant du cours" className="select-input" required disabled={!component || !assignments.length} value={assignmentId} onChange={event => onChange(event.target.value)}><option value="">Choisir l’enseignant</option>{assignments.map(row => <option key={row.id} value={row.id}>{directory.teachers.find(teacher => teacher.id === row.teacherId)?.name} · du {row.validFrom}{row.validUntil ? ` au ${row.validUntil}` : ', sans date de fin'}</option>)}</select></label>
    {component && !assignments.length && <p>Aucun enseignant n’est encore affecté à cette matière pour ce groupe.</p>}
    {component && offering && canAssign && <button type="button" className="btn btn-outline" onClick={() => onAssign({ groupId, offeringId: offering.id, componentId: component.id })}>Affecter un enseignant ici</button>}
    {!directory.groups.length && <p>Aucun groupe disponible. Préparez les groupes et leurs formations dans « Année scolaire ».</p>}
  </fieldset>;
}
