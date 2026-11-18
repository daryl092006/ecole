"""Validate the extracted November timetable review without remote access."""
import argparse
import json
from collections import Counter
from pathlib import Path


def verify(plan_path, snapshot_path):
    plan = json.loads(plan_path.read_text())
    tables = json.loads(snapshot_path.read_text())['tables']
    sources = {s['file']: s for s in plan['sources']}
    assignments = {a['id']: a for a in tables['teaching_assignments']}
    groups = {g['id']: g for g in tables['groups']}
    assert plan['remote_writes'] == 0
    assert len(sources) == 7
    assert len(plan['date_anomalies']) == 1
    assert plan['counts'] == {'COURS': 101, 'EXAMEN': 2, 'DEVOIR': 1, 'EVENEMENT': 16}
    identities = set()
    for row in plan['candidates']:
        source = sources[row['source']]
        assert not row['date_mismatch'] and not source['date_mismatch']
        assert source['from'] <= row['date'] <= source['until']
        assert row['start'] < row['end']
        assert groups[row['group_id']]['academic_year_id'] == plan['academic_year_id']
        key = (row['group_id'], row['date'], row['start'], row['end'])
        assert key not in identities, f'Doublon : {key}'
        identities.add(key)
        if row['assignment_id']:
            assert assignments[row['assignment_id']]['group_id'] == row['group_id']
            assert assignments[row['assignment_id']]['teacher_id'] == row['teacher_id']
        if row['kind'] == 'EVENEMENT':
            assert row['date'] in ['2026-11-19', '2026-11-20']
            assert row['assignment_id'] is None
        if row['group'] == 'L3 IA & GL' and row['date'] >= '2026-11-16':
            assert 'Du 16 au 21' in row['source']
            assert row['date'] != '2026-11-21', 'Le samedi vide de la révision remplace les anciens cours'
    assert sum(row['assignment_id'] is not None and row['kind'] == 'COURS' for row in plan['candidates']) == 48
    assert all(row['reasons'] for row in plan['candidates']), 'Les blocages de validation doivent rester explicites'
    print(json.dumps({'sources': len(sources), 'occurrences': len(identities), 'counts': dict(Counter(r['kind'] for r in plan['candidates'])), 'known_course_assignments': 48, 'date_mismatch_excluded': True, 'specific_revision_precedence': True, 'duplicates': 0, 'remote_writes': 0}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path, required=True)
    args = parser.parse_args()
    verify(args.plan, args.snapshot)
