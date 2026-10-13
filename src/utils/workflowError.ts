import { ZodError } from 'zod';
export function workflowError(error: unknown) {
  if (error instanceof ZodError) return 'Vérifiez les champs : ' + error.issues.slice(0, 3).map(item => item.path.join('.')).join(', ') + '.';
  return error instanceof Error ? error.message : 'L’opération est impossible.';
}
