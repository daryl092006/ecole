-- Proposition : ne plus masquer les articles publiés des années précédentes.
-- La fonction publique principale conserve ses contrôles des formations et des candidatures.
-- Aucun article ni statut n'est modifié ; les droits de cette fonction existante sont conservés.
BEGIN;

CREATE OR REPLACE FUNCTION public.escen_website_public_before_offerings(
  p_action text,
  p_token_hash text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  RETURN public.escen_website_public_before_annual_scope(p_action, p_token_hash, p_data);
END;
$function$;

COMMIT;
