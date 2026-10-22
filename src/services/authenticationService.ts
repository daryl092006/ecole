/** Human-readable errors without presenting transport failures as invalid credentials. */
export function authenticationErrorMessage(error: unknown): string {
  const value = error && typeof error === 'object' ? error as { code?: string; status?: number; name?: string; message?: string } : {};
  if (value.status === 429 || value.code === 'over_request_rate_limit' || value.code === 'over_email_send_rate_limit') return 'Trop de tentatives de connexion. Patientez quelques instants avant de réessayer.';
  if (value.code === 'email_not_confirmed' || value.message === 'Email not confirmed') return 'Adresse email à confirmer auprès de l’administration ESCEN.';
  if (value.code === 'user_banned') return 'Votre accès est suspendu. Contactez l’administration ESCEN.';
  if ((value.status && value.status >= 500) || value.name === 'AuthRetryableFetchError' || value.name === 'TypeError' || /network|fetch|timeout/i.test(value.message || '')) return 'Le service de connexion est temporairement inaccessible. Vérifiez votre connexion et réessayez.';
  return 'Adresse email ou mot de passe incorrect.';
}
