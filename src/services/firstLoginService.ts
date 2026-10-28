type Metadata = Record<string, unknown>;
export function firstLoginState(metadata: Metadata = {}, enabled = false) {
  const record = metadata.escen_first_login as Metadata | undefined;
  const current = record?.version === 1;
  const passwordChanged = current && typeof record.password_changed_at === 'string' && !!record.password_changed_at;
  const completed = current && (record.exempt === true || passwordChanged && typeof record.profile_reviewed_at === 'string' && !!record.profile_reviewed_at
    && ['CONFIRM', 'REPORT'].includes(String(record.profile_review)));
  const firstLoginRequired = enabled && !completed;
  const mustChangePassword = metadata.must_change_password === true || firstLoginRequired && !passwordChanged;
  return { firstLoginRequired, mustChangePassword, mustVerifyProfile: firstLoginRequired && !mustChangePassword };
}
