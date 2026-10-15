// Browser request context; every selected UUID is independently checked by the server.
let selection = 'current';
let resolvedYearId: string | null = null;
export function setAcademicYearRequestSelection(value: string) { selection = value; resolvedYearId = null; }
export function setResolvedAcademicYearRequest(yearId: string | null) { resolvedYearId = yearId; }
export function academicYearRequestHeaders(useResolved = true) { return { 'x-escen-year': useResolved && selection === 'current' && resolvedYearId ? resolvedYearId : selection }; }
