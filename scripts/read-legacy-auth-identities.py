"""Stream credential hashes from the verified source archive to a local importer.

Hashes are emitted only on stdout for the calling process. This utility never
writes credentials to disk or prints them to the terminal.
"""
import hashlib
import importlib.util
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('legacy_data', ROOT / 'scripts/prepare-legacy-data.py')
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)

archive_path = Path(sys.argv[1]).resolve()
work = ROOT / '.tmp/legacy-database'
manifest = json.loads((work / 'manifest.json').read_text())
digest = hashlib.sha256()
with archive_path.open('rb') as source_file:
    for block in iter(lambda: source_file.read(1024 * 1024), b''):
        digest.update(block)
archive_hash = digest.hexdigest()
if archive_hash != manifest['archive_sha256']:
    raise SystemExit('L’archive ne correspond pas à celle des identités déjà importées.')
with zipfile.ZipFile(archive_path) as archive:
    sql = archive.read('database.sql')
if hashlib.sha256(sql).hexdigest() != manifest['sql_sha256']:
    raise SystemExit('Le dump SQL ne correspond pas à la source importée.')
tables = legacy.parse_dump(sql.decode('utf-8'))
accounts = {
    (row['source_table'], str(row['source_id'])): row
    for row in map(json.loads, (work / 'identity-accounts.jsonl').read_text().splitlines())
}
profiles = {
    (row['source_table'], str(row['source_id'])): row
    for row in map(json.loads, (work / 'identity-profiles.jsonl').read_text().splitlines())
}
role_accounts = {
    row['account_id']
    for row in map(json.loads, (work / 'identity-role-grants.jsonl').read_text().splitlines())
}
rows = []
for table_name in ('users', 'etudiants'):
    for source in tables[table_name]['rows']:
        key = (table_name, str(source['id']))
        account = accounts.get(key)
        profile = profiles.get(key)
        if account is None or profile is None:
            continue
        source_email = source.get('email') or ''
        email = source_email.strip().lower()
        password_hash = source.get('password') or ''
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or not re.fullmatch(r'\$2y\$\d{2}\$[./A-Za-z0-9]{53}', password_hash):
            raise SystemExit('Une identité source ne contient pas un courriel ou hash bcrypt reconnu.')
        if profile.get('email', '').strip().lower() != email:
            raise SystemExit('Le courriel source ne correspond pas au profil importé.')
        rows.append({
            'account_id': account['id'],
            'source_table': table_name,
            'source_id': str(source['id']),
            'email': email,
            'email_normalization_needed': source_email != email,
            'password_hash': password_hash,
            'email_verified_at': source.get('email_verified_at'),
            'must_change_password': str(source.get('must_change_password') or '0') == '1',
            'has_mapped_role': account['id'] in role_accounts,
        })
if len(rows) != len(accounts) or len({row['email'] for row in rows}) != len(rows):
    raise SystemExit('Le nombre ou l’unicité des identités source ne correspond pas.')
print(json.dumps(rows, ensure_ascii=False))
