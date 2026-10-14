"""Préparer et contrôler un dump ESCEN sans exécuter de SQL ou accéder au réseau.

Les fichiers avec données personnelles sont écrits uniquement sous .tmp/, ignoré
par Git. Les sauvegardes originales ne sont jamais modifiées. Les secrets ne
sont pas réactivés ni recopiés dans les fichiers de travail.
"""
import argparse
import hashlib
import json
import os
import re
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOKEN = re.compile(r"\s*(?:('(?:\\.|''|[^'\\])*')|([(),;])|([^(),;\s]+))", re.S)
COMMON = {
    'annee_scolaire_id': 'annee_scolaires', 'filiere_id': 'filieres',
    'niveau_id': 'niveaux', 'periode_id': 'periodes', 'group_id': 'groups',
    'etudiant_id': 'etudiants', 'bourse_id': 'bourses', 'user_id': 'users',
    'role_id': 'roles', 'permission_id': 'permissions', 'unite_valeur_id': 'unite_valeurs',
    'unite_enseignement_id': 'unite_enseignements', 'evaluation_id': 'evaluations',
    'salle_id': 'salles', 'emploi_du_temps_id': 'emploi_du_temps', 'note_id': 'notes',
    'releve_note_id': 'releve_notes', 'uv_id': 'unite_valeurs', 'presence_id': 'presences',
    'fiche_de_presence_id': 'fiche_de_presences', 'frais_etudiant_id': 'frais_etudiants',
    'frais_scolarite_id': 'frais_scolarites', 'bourse_etudiant_id': 'bourse_etudiants',
    'echeancier_id': 'echeanciers', 'reclamation_id': 'reclamations',
    'enseignant_id': 'users', 'created_by': 'users', 'modifiee_par': 'users',
    'annule_par': 'users', 'traitee_par': 'users', 'document_type_id': 'document_types',
    'matiere_id': 'matieres', 'uniteValeur_id': 'unite_valeurs',
}
SECRET = re.compile(r'password|remember_token|session_token|draft_token|qr_token|access_token|refresh_token|api_key|secret|^token$|authorization', re.I)
POLYMORPHIC = {'owner_id': 'owner_type', 'user_id': 'user_type', 'payable_id': 'payable_type', 'ticketable_id': 'ticketable_type'}


def sql_value(quoted, bare):
    if quoted is None:
        return None if bare == 'NULL' else bare
    return re.sub(r'\\(.)', lambda match: {'n': '\n', 'r': '\r', 't': '\t', '0': '\0'}.get(match[1], match[1]), quoted[1:-1].replace("''", "'"))


def parse_dump(sql):
    tables = {}
    for match in re.finditer(r'CREATE TABLE `([^`]+)`\s*\((.*?)\) ENGINE[^;]*;', sql, re.S):
        name, body = match.groups()
        tables[name] = {
            'columns': dict(re.findall(r'^\s*`([^`]+)`\s+(.+?)(?:,)?$', body, re.M)),
            'foreign_keys': re.findall(r'FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)', body),
            'rows': [],
        }
    for match in re.finditer(r'INSERT INTO `([^`]+)`\s*\(([^)]+)\)\s*VALUES', sql):
        name, header = match.groups()
        if name not in tables:
            raise ValueError('INSERT sans table déclarée')
        columns = re.findall(r'`([^`]+)`', header)
        position, current = match.end(), None
        while True:
            item = TOKEN.match(sql, position)
            if not item:
                raise ValueError('Syntaxe INSERT non prise en charge')
            position = item.end()
            quoted, punctuation, bare = item.groups()
            if punctuation == ';':
                break
            if punctuation == '(':
                current = []
            elif punctuation == ')':
                if current is None or len(current) != len(columns):
                    raise ValueError('Nombre de colonnes incompatible')
                tables[name]['rows'].append(dict(zip(columns, current)))
                current = None
            elif punctuation != ',':
                if current is None:
                    raise ValueError('Valeur hors tuple SQL')
                current.append(sql_value(quoted, bare))
    return tables


def read_source(path):
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            if archive.testzip() is not None:
                raise ValueError('Archive ZIP corrompue')
            if archive.getinfo('database.sql').file_size > 100_000_000:
                raise ValueError('Dump trop volumineux pour ce préparateur')
            data = archive.read('database.sql')
    else:
        data = path.read_bytes()
    return parse_dump(data.decode('utf-8')), hashlib.sha256(data).hexdigest()


def redact(value, sensitive_table=False):
    if isinstance(value, dict):
        return {key: '[REDACTED]' if SECRET.search(key) or (sensitive_table and key in ('value', 'valeur', 'options', 'payload'))
                else redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, str) and value.startswith(('{', '[')):
        try:
            return json.dumps(redact(json.loads(value)), ensure_ascii=False)
        except (ValueError, TypeError):
            pass
    return value


def links_for(name, table):
    links = {column: (target, target_column) for column, target, target_column in table['foreign_keys']}
    for column, target in COMMON.items():
        if column in table['columns'] and column not in links and not (name == 'role_user' and column == 'user_id'):
            links[column] = (target, 'id')
    for column, target in {
        'evaluation_room_id': 'evaluation_rooms',
        'submission_id': 'evaluation_submissions',
        'part_id': 'exam_parts' if name.startswith('exam_') else 'parts',
        'question_id': 'exam_questions' if name.startswith('exam_') else 'evaluation_questions',
    }.items():
        if column in table['columns'] and column not in links:
            links[column] = (target, 'id')
    return links


def write_private(path, content):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, 'w') as handle:
        handle.write(content)
    os.chmod(path, 0o600)


def prepare(archive_path, older_paths, output):
    output = output.resolve()
    if not output.is_relative_to(ROOT / '.tmp'):
        raise ValueError('Les données de travail doivent rester sous .tmp/')
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(output, 0o700)
    tables, sql_hash = read_source(archive_path)
    mapping = json.loads((ROOT / 'supabase/legacy-table-map.json').read_text())
    if set(tables) != set(mapping):
        raise ValueError('Schéma source différent du catalogue : correspondance à revoir')
    older = [(path.name, *read_source(path)) for path in older_paths if path != archive_path]
    indexes = {name: {row.get('id'): row for row in table['rows']} for name, table in tables.items()}
    stage, issues, recoveries = [], [], {}
    issue_counts = Counter()
    seen_permissions = set()
    key_set = set()
    for name, table in tables.items():
        for sequence, row in enumerate(table['rows']):
            source_id = str(row.get('id', row.get('email', sequence)))
            key = f'{name}:{source_id}'
            if key in key_set:
                raise ValueError('Clé source répétée : reprise interrompue, aucune ligne éliminée')
            key_set.add(key)
            current_issues = []
            if mapping[name]['handling'] != 'ARCHIVE_ONLY':
                for column, (target, target_column) in links_for(name, table).items():
                    value = row.get(column)
                    if value is None:
                        continue
                    target_values = indexes.get(target, {}) if target_column == 'id' else {r.get(target_column): r for r in tables[target]['rows']}
                    if value not in target_values:
                        candidates = []
                        for old_name, old_tables, old_sql_hash in older:
                            old_row = next((r for r in old_tables.get(target, {}).get('rows', []) if r.get(target_column) == value), None)
                            if old_row is not None:
                                candidates.append(old_name)
                                recovery_key = (old_name, target, str(value))
                                recoveries[recovery_key] = {'archive': old_name, 'sql_sha256': old_sql_hash, 'source_table': target, 'source_id': str(value), 'payload': redact(old_row)}
                        current_issues.append({'code': f'MISSING_PARENT:{column}', 'target_table': target, 'target_id': value, 'candidate_archives': candidates})
                for column, type_column in POLYMORPHIC.items():
                    if column not in row or row[column] is None or not row.get(type_column):
                        continue
                    kind = row[type_column].replace('\\', '').lower()
                    target = next((table_name for suffix, table_name in [('etudiant', 'etudiants'), ('user', 'users'), ('candidature', 'candidatures'), ('echeance', 'echeances'), ('fraisetudiant', 'frais_etudiants'), ('fraisscolarite', 'frais_scolarites'), ('fraisinscription', 'frais_inscriptions')] if kind.endswith(suffix)), None)
                    if target is None:
                        current_issues.append({'code': f'UNRESOLVED_POLYMORPHIC:{column}'})
                    elif row[column] not in indexes[target]:
                        current_issues.append({'code': f'MISSING_POLYMORPHIC_PARENT:{column}', 'target_table': target, 'target_id': row[column]})
                if name == 'etudiant_group':
                    group = indexes['groups'].get(row['group_id'])
                    if group and row['annee_scolaire_id'] != group['annee_scolaire_id']:
                        current_issues.append({'code': 'GROUP_YEAR_MISMATCH'})
                if name == 'permission_role':
                    pair = (row['permission_id'], row['role_id'])
                    if pair in seen_permissions:
                        current_issues.append({'code': 'DUPLICATE_ROLE_PERMISSION'})
                    seen_permissions.add(pair)
            status = 'ARCHIVE_ONLY' if mapping[name]['handling'] == 'ARCHIVE_ONLY' else 'QUARANTINED' if current_issues else 'PENDING'
            stage.append({'source_table': name, 'source_id': source_id, 'status': status,
                          'payload': redact(row, name in ('current_envs', 'configurations', 'jobs', 'failed_jobs'))})
            for issue in current_issues:
                issues.append({'source_table': name, 'source_id': source_id, **issue})
                issue_counts[f'{name}.{issue["code"]}'] += 1
    metadata = {
        'source_name': archive_path.name, 'archive_sha256': hashlib.sha256(archive_path.read_bytes()).hexdigest(),
        'sql_sha256': sql_hash, 'source_tables': len(tables), 'source_rows': len(stage),
        'row_counts': {name: len(table['rows']) for name, table in tables.items()},
        'statuses': dict(Counter(row['status'] for row in stage)), 'issue_counts': dict(issue_counts),
        'recovery_candidates': len(recoveries),
        'recovery_warning': 'Suggestions par clé source uniquement ; aucune fusion ou correction automatique.',
    }
    metadata['file_sha256'] = {}
    for filename, records in [('legacy-rows.jsonl', stage), ('quarantine-issues.jsonl', issues), ('recovery-candidates.jsonl', list(recoveries.values()))]:
        content = ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in records)
        metadata['file_sha256'][filename] = hashlib.sha256(content.encode('utf-8')).hexdigest()
        write_private(output / filename, content)
    write_private(output / 'manifest.json', json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    # Les données de travail conservent chaque ligne, y compris les cas invalides.
    if sum(metadata['statuses'].values()) != metadata['source_rows']:
        raise ValueError('Contrôle de conservation échoué')
    return metadata


def self_test():
    sample = "CREATE TABLE `test` (`id` int, `text` text) ENGINE=InnoDB;\nINSERT INTO `test` (`id`, `text`) VALUES (1, 'été;\\n apostrophe\\\' et \\\\ chemin'), (2, NULL);"
    rows = parse_dump(sample)['test']['rows']
    assert rows[0]['text'] == "été;\n apostrophe' et \\ chemin"
    assert rows[1]['text'] is None
    assert redact({'password': 'secret', 'nested': {'token': 'secret'}, 'nom': 'Test'}) == {'password': '[REDACTED]', 'nested': {'token': '[REDACTED]'}, 'nom': 'Test'}
    try:
        parse_dump("CREATE TABLE `t` (`id` int) ENGINE=InnoDB; INSERT INTO `t` (`id`) VALUES (1,2);")
    except ValueError:
        pass
    else:
        raise AssertionError('Tuple SQL incohérent accepté')
    print('Préparateur : échappements SQL, NULL, UTF-8, redaction et refus des tuples incohérents vérifiés.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--older', type=Path, nargs='*', default=[])
    parser.add_argument('--output-dir', type=Path, default=ROOT / '.tmp/legacy-database')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif args.archive:
        result = prepare(args.archive, args.older, args.output_dir)
        print(json.dumps({key: value for key, value in result.items() if key != 'row_counts'}, ensure_ascii=False, indent=2))
    else:
        parser.error('--archive ou --self-test requis')
