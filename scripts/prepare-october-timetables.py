"""Prepare an offline, reviewable import; never writes to the application database.

Requires PyMuPDF (fitz). Input snapshot must come from the read-only backend RPC.
"""
import argparse
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

import fitz


def normalized(value):
    value = unicodedata.normalize('NFKD', value.casefold())
    return ' '.join(re.findall(r'[a-z0-9]+', value))


def prepare(pdf_directory, snapshot_path, roster_path, output):
    if output.exists():
        raise ValueError('Choisir un nouveau répertoire pour préserver la relecture précédente.')
    snapshot = json.loads(snapshot_path.read_text())
    tables = snapshot['tables']
    people = tables['people']
    year = next(row for row in tables['academic_years'] if row['code'] == '2026-2027')
    with roster_path.open() as stream:
        roster = list(csv.DictReader(stream, delimiter=';'))
    emails = [row['email'] for row in roster]
    if len(set(emails)) != len(emails) or any(not re.fullmatch(r'[^\s@]+@escen\.university', email) for email in emails):
        raise ValueError('Adresses invalides ou dupliquées dans la liste.')
    identities = []
    for row in roster:
        # Only email matches are automatic. Names are review candidates, never merges.
        lookup = {'a.enoc.coach@escen.university': 'a.enoc.coah@escen.university',
                  'a.eric.coach@escen.university': 'a.eric@escen.university'}.get(row['email'], row['email'])
        matches = [p for p in people if (p.get('email') or '').casefold() == lookup]
        if len(matches) > 1:
            raise ValueError(f'Adresse ambiguë : {lookup}')
        person = matches[0] if matches else None
        tokens = set(normalized(re.sub(r'^(Dr\.|Mme\.?|M\.)\s*', '', row['nom'])).split())
        candidates = [p for p in people if tokens and
                      tokens == set(normalized(p['firstname'] + ' ' + p['lastname']).split())]
        staff = next((s for s in tables['staff'] if person and s['person_id'] == person['id']), None)
        teacher = next((t for t in tables['teachers'] if staff and t['staff_id'] == staff['id']), None)
        account = next((a for a in tables['accounts'] if person and a['person_id'] == person['id']), None)
        identities.append({**row, 'person_id': person['id'] if person else None,
                           'existing_name': (person['firstname'] + ' ' + person['lastname']) if person else None,
                           'existing_email': person.get('email') if person else None,
                           'teacher_id': teacher['id'] if teacher else None,
                           'account_id': account['id'] if account else None,
                           'name_candidates': [{'id': p['id'], 'email': p.get('email')} for p in candidates] if not person else [],
                           'action': 'CONSERVER_PROFIL' if teacher else 'COMPLETER_PROFIL' if person else
                           'RAPPROCHEMENT_A_VALIDER' if candidates else 'IDENTITE_A_CREER'})
    sessions, sources = [], []
    for pdf in sorted(pdf_directory.glob('EMPLOI DU TEMPS*.pdf')):
        group = ('L1' if 'L1' in pdf.name else 'L2') + (' IA & GL' if 'IA' in pdf.name else ' TC')
        start, end = (date(2026, 10, 19), date(2026, 10, 30)) if group.startswith('L1') else (date(2026, 10, 12), date(2026, 10, 24))
        with fitz.open(pdf) as document:
            if len(document) != 1 or '2026-2027' not in document[0].get_text():
                raise ValueError(f'Source inattendue : {pdf.name}')
            grids = document[0].find_tables().tables
            if len(grids) != 1:
                raise ValueError(f'Grille ambiguë : {pdf.name}')
            for row in grids[0].extract():
                hours = re.findall(r'\d{2}h\d{2}', row[0] or '')
                if len(hours) != 2:
                    continue
                for weekday in range(6):
                    cell = (row[3 + weekday * 3] or '').replace('AGB ODJAN', 'AGBODJAN')
                    teacher = re.search(r'(?:M\.|Dr\.)\s', cell)
                    if not teacher:
                        continue  # TPE / clubs / free periods are not teacher-led sessions.
                    for week in range(2):
                        on = start + timedelta(days=weekday + 7 * week)
                        if on <= end:
                            sessions.append({'source': pdf.name, 'group': group, 'date': str(on),
                                             'start': hours[0].replace('h', ':'), 'end': hours[1].replace('h', ':'),
                                             'subject': ' '.join(cell[:teacher.start()].split()),
                                             'teacher': ' '.join(cell[teacher.start():].split()),
                                             'status': 'A_VALIDER'})
        sources.append({'file': pdf.name, 'sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(),
                        'from': str(start), 'until': str(end)})
    if len(sources) != 4 or Counter(s['group'] for s in sessions) != {'L1 TC': 34, 'L1 IA & GL': 30, 'L2 TC': 36, 'L2 IA & GL': 38}:
        raise ValueError('Les sources ont changé : contrôler visuellement les grilles avant de poursuivre.')
    shared = defaultdict(list)
    for session in sessions:
        shared[(session['date'], session['start'], session['teacher'])].append(session)
    overlaps = [rows for rows in shared.values() if len(rows) > 1]
    group_map = {'L1 TC': 'L1 TRONC COMMUN', 'L1 IA & GL': 'L1 IA', 'L2 TC': 'L2 TRONC COMMUN', 'L2 IA & GL': 'L2 IA'}
    groups = []
    for source, target in group_map.items():
        found = [g for g in tables['groups'] if g['name'] == target and g['academic_year_id'] == year['id'] and not g.get('archived_at')]
        offerings = {link['offering_id'] for link in tables['group_offerings'] if any(g['id'] == link['group_id'] for g in found) and not link.get('archived_at')}
        curricula = {o['curriculum_id'] for o in tables['academic_offerings'] if o['id'] in offerings}
        subject_ids = {c['subject_id'] for c in tables['curriculum_components'] if c['curriculum_id'] in curricula and not c.get('archived_at')}
        groups.append({'source': source, 'groups': found, 'offering_ids': sorted(offerings),
                       'subjects': [s['name'] for s in tables['subjects'] if s['id'] in subject_ids]})
    output.mkdir(parents=True, mode=0o700)
    def save(name, value):
        (output / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    save('enseignants-rapprochement.json', identities)
    save('sources.json', sources)
    save('regroupements-a-confirmer.json', overlaps)
    save('groupes-et-matieres.json', groups)
    with (output / 'seances-candidates.csv').open('w') as stream:
        writer = csv.DictWriter(stream, fieldnames=sessions[0].keys())
        writer.writeheader()
        writer.writerows(sessions)
    summary = {'revision': snapshot['revision'], 'teachers': len(roster),
               'identity_actions': dict(Counter(i['action'] for i in identities)),
               'sessions': len(sessions), 'shared_slots': len(overlaps),
               'rooms': len(tables['rooms']), 'missing_groups': [g['source'] for g in groups if not g['groups']],
               'remote_writes': 0, 'ready_for_import': False}
    save('validation.json', summary)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf-directory', type=Path, required=True)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--roster', type=Path, default=Path('docs/imports/enseignants-2026-11-04.csv'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.pdf_directory, args.snapshot, args.roster, args.output)
