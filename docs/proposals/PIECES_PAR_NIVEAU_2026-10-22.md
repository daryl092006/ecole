# Pièces communes par niveau — proposition soumise à accord

La règle demandée est : une seule liste de pièces par année et niveau, commune à toutes les filières. L'ouverture aux candidatures reste propre à chaque filière et niveau. La présentation précédente conservait à tort les pièces dans chaque couple filière–niveau.

## Présentation prévue

Deux rubriques dans la même page :

1. **Pièces par niveau** : une ligne Licence 1, Licence 2, Licence 3, Master 1, Master 2 ou Executive Master, avec leurs pièces et une action « Configurer les pièces ». La confirmation indique les filières concernées et les valeurs avant/après. Le niveau et l'année servent de clé, jamais la filière.
2. **Filières proposées** : une seule entrée Finance Digitale, une seule Marketing Digital, etc. En ouvrant la filière, ses niveaux sont affichés avec leur état ouvert/fermé. Aucune édition des pièces dans ces lignes ; elles renvoient à la règle commune du niveau.

Exemple : Finance Digitale apparaît une seule fois ; ses niveaux Licence 1, Licence 2 et Master 1 sont rassemblés. Modifier les pièces de Licence 1 met à jour Licence 1 de Finance Digitale, Marketing Digital et de toute autre filière concernée, sans toucher Licence 2 ni une autre année.

## Persistance et interconnexion

Le SQL proposé crée une règle unique par année et niveau, une RPC transactionnelle utilisant les droits existants et les versions attendues, ainsi qu'un trigger qui impose les pièces du niveau aux campagnes existantes et futures. Le cache des pièces des campagnes reste synchronisé, donc le formulaire public et la vérification des dossiers utilisent les mêmes pièces sans modifier les anciennes RPC publiques.

Une sauvegarde échoue intégralement si une campagne a changé entre la lecture et la confirmation. Les ouvertures, libellés et dossiers reçus ne sont pas modifiés par le changement des pièces. Les divergences historiques entre filières ne sont ni fusionnées ni arbitrées automatiquement : elles seront présentées pour confirmation explicite.

Le SQL est fourni dans `PIECES_PAR_NIVEAU_2026-10-22.sql`. Il s'agit d'une proposition, pas d'une migration active. Il n'a été exécuté ni localement ni à distance. Après accord : création d'une nouvelle migration, tests PGlite, mise à jour simultanée des deux dictionnaires de schéma, API contrôlée par année et permission, puis interface et tests navigateur du portail et du formulaire public.

## Point d'arrêt demandé par AGENTS.md

« Avant chaque migration SQL : présenter son SQL et attendre l’accord. » La création et l'exécution de la migration attendent cet accord. Aucune migration existante ne sera modifiée ; aucun déploiement ou changement de base distante n'est prévu.
