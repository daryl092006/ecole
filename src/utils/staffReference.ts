// Le personnel administratif n'a pas de matricule. Une référence interne technique,
// jamais affichée, satisfait la contrainte d'unicité existante de escen.staff.employee_number.
export const INTERNAL_REFERENCE_PREFIX = 'INT-';
export const internalStaffReference = () => `${INTERNAL_REFERENCE_PREFIX}${crypto.randomUUID()}`;
export const isInternalStaffReference = (value: unknown) => /^INT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
/** Matricule affichable : vide pour une référence interne. */
export const displayedEmployeeNumber = (value: unknown) => isInternalStaffReference(value) ? '' : String(value || '');
