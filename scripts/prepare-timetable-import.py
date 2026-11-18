"""Read PDF timetables and prepare a reviewable plan. Never writes to the portal."""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

import fitz

MONTHS = {'octobre': 10, 'novembre': 11, 'décembre': 12, 'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'septembre': 9}
GROUP_NAMES = {'L1 TC': 'L1 TRONC COMMUN', 'L1 IA & GL': 'L1 IA', 'L2 TC': 'L2 TRONC COMMUN', 'L2 IA & GL': 'Licence 2 IA', 'L3 IA & GL': 'Licence 3 IA'}


def normalize(value):
    return ' '.join(re.findall(r'[a-z0-9]+', unicodedata.normalize('NFKD', value.casefold())))


def period(text):
    match = re.search(r'Semaine du lundi,?\s*(\d{1,2})\s+au\s+(?:samedi|vendredi)\s+(\d{1,2})\s+(\w+)\s+(\d{4})', text, re.I)
    if not match or match[3].casefold() not in MONTHS:
        raise ValueError('Période source absente ou non reconnue')
    start = date(int(match[4]), MONTHS[match[3].casefold()], int(match[1]))
    end = start.replace(day=int(match[2]))
    if start.weekday() != 0 or end < start:
        raise ValueError('Période source incohérente')
    return start, end


def prepare(directory, source_list, snapshot_file, output):
    snapshot = json.loads(snapshot_file.read_text())
    tables = snapshot['tables']
    year = next(y for y in tables['academic_years'] if y['id'] == tables['academic_working_year'][0]['academic_year_id'])
    by_id = {name: {row['id']: row for row in rows} for name, rows in tables.items()}
    sources, entries, candidates, anomalies = [], [], [], []
    for source in json.loads(source_list.read_text()):
        path = directory / source['file']
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != source['sha256']:
            raise ValueError(f'Source modifiée depuis la lecture initiale : {path.name}')
        document = fitz.open(path)
        text = '\n'.join(page.get_text(sort=True) for page in document)
        start, end = period(text)
        if year['name'] not in text:
            raise ValueError(f'Année incohérente : {path.name}')
        group_match = re.search(r'COURS\s+(L[123])\s+(IA\s*&\s*GL|TC)', text)
        if not group_match:
            raise ValueError(f'Groupe source absent : {path.name}')
        group_label = group_match[1] + ' ' + ' '.join(group_match[2].split())
        groups = [g for g in tables['groups'] if g['name'] == GROUP_NAMES[group_label] and g['academic_year_id'] == year['id'] and not g.get('archived_at')]
        if len(groups) != 1:
            raise ValueError(f'Groupe cible ambigu : {group_label}')
        group = groups[0]
        mismatch = 'nov' in path.name.casefold() and start.month != 11
        if mismatch:
            anomalies.append({'file': path.name, 'reason': 'Le nom annonce novembre, le contenu indique octobre.', 'from': str(start), 'until': str(end)})
        info = {'file': path.name, 'sha256': digest, 'group': group_label, 'group_id': group['id'], 'from': str(start), 'until': str(end), 'days': (end-start).days+1, 'date_mismatch': mismatch}
        sources.append(info)
        grids = document[0].find_tables().tables
        if len(grids) != 1:
            raise ValueError(f'Grille ambiguë : {path.name}')
        for row in grids[0].extract():
            hours = re.findall(r'\d{2}h\d{2}', row[0] or '')
            if len(hours) != 2:
                continue
            for offset in range((end-start).days+1):
                day = start + timedelta(days=offset)
                if day.weekday() > 5:
                    continue
                cell = ' '.join((row[3 + day.weekday()*3] or '').replace('AGB ODJAN', 'AGBODJAN').split())
                if not cell or cell in ['LIBRE', 'TPE', 'Activités des Clubs']:
                    continue
                teacher = re.search(r'(?:M\.|Dr\.)\s*', cell)
                kind = 'COURS' if teacher else 'EXAMEN' if 'EXAMEN' in cell else 'DEVOIR' if 'DEVOIR' in cell else 'EVENEMENT'
                subject = cell[:teacher.start()].strip() if teacher else re.sub(r'\s*(EXAMEN|DEVOIR)\s*$', '', cell)
                entries.append({'source': path.name, 'group': group_label, 'group_id': group['id'], 'date': str(day), 'start': hours[0].replace('h', ':'), 'end': hours[1].replace('h', ':'), 'kind': kind, 'subject': subject, 'teacher_source': cell[teacher.start():] if teacher else None, 'cell': cell, 'date_mismatch': mismatch})
    for entry in entries:
        if entry['date_mismatch']:
            continue
        versions = [s for s in sources if s['group_id'] == entry['group_id'] and not s['date_mismatch'] and s['from'] <= entry['date'] <= s['until']]
        chosen = min(versions, key=lambda s: s['days'])
        tied = [s for s in versions if s['days'] == chosen['days']]
        if len({s['sha256'] for s in tied}) > 1:
            raise ValueError(f'Versions concurrentes à départager : {entry["group"]} {entry["date"]}')
        if entry['source'] != chosen['file']:
            continue
        reasons = []
        assignments = [a for a in tables['teaching_assignments'] if a['group_id'] == entry['group_id'] and not a.get('archived_at')]
        def subject(a):
            c = by_id['curriculum_components'].get(a['component_id'], {})
            return by_id['subjects'].get(c.get('subject_id'), {}).get('name', '')
        matches = [a for a in assignments if normalize(subject(a)) == normalize(entry['subject'])]
        if entry['kind'] == 'EVENEMENT':
            reasons.append('Événement sans matière ni enseignant : traitement à confirmer.')
        elif len(matches) != 1:
            reasons.append('Matière/affectation exacte absente ou ambiguë.')
        assignment = matches[0] if len(matches) == 1 else None
        teacher_name, email = None, None
        if assignment:
            te = by_id['teachers'].get(assignment['teacher_id'], {})
            st = by_id['staff'].get(te.get('staff_id'), {})
            p = by_id['people'].get(st.get('person_id'), {})
            teacher_name = ' '.join([p.get('firstname', ''), p.get('lastname', '')]).strip()
            email = p.get('email')
            source_teacher = normalize(re.sub(r'^(M\.|Dr\.)\s*', '', entry['teacher_source'] or ''))
            if source_teacher and source_teacher not in normalize(teacher_name):
                reasons.append('Enseignant différent de l’affectation actuelle.')
            if not email or email.casefold().endswith('@escen.university'):
                reasons.append('E-mail personnel enseignant requis par la route de programmation.')
            if assignment['valid_from'] > entry['date'] or assignment.get('valid_until') and assignment['valid_until'] < entry['date']:
                reasons.append('Date hors de la période de l’affectation.')
        if entry['kind'] in ['EXAMEN', 'DEVOIR']:
            reasons.append('Épreuve : valider salle et organisation avant programmation.')
        candidates.append({**entry, 'assignment_id': assignment['id'] if assignment else None, 'teacher_id': assignment['teacher_id'] if assignment else None, 'teacher_name': teacher_name, 'personal_email_available': bool(email and not email.casefold().endswith('@escen.university')), 'reasons': reasons})
    result = {'revision': snapshot['revision'], 'academic_year_id': year['id'], 'sources': sources, 'date_anomalies': anomalies, 'candidates': candidates, 'counts': dict(Counter(c['kind'] for c in candidates)), 'blocked_reasons': dict(Counter(reason for c in candidates for reason in c['reasons'])), 'remote_writes': 0}
    output.mkdir(parents=True, exist_ok=True)
    (output/'plan.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({key: result[key] for key in ['revision', 'counts', 'blocked_reasons', 'date_anomalies', 'remote_writes']}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.directory, args.sources, args.snapshot, args.output)
