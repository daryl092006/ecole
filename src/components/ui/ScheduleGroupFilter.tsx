'use client';

export default function ScheduleGroupFilter({ groups, value, onChange, count }: {
  groups: { id: string; label: string }[];
  value: string;
  onChange: (groupId: string) => void;
  count: number;
}) {
  return <div className="schedule-group-filter">
    <label className="form-group">Groupe<select className="select-input" value={value} onChange={event => onChange(event.target.value)}>
      <option value="">Tous les groupes</option>
      {groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
    </select></label>
    <p role="status">{count} séance{count > 1 ? 's' : ''} pour cette sélection.</p>
    {value && <button type="button" className="btn btn-outline" onClick={() => onChange('')}>Afficher tous les groupes</button>}
  </div>;
}
