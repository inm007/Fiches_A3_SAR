# Mémoire de projet — P13 / Fiche A3 SAR

## 1. Contexte

Projet : numérisation de la fiche A3 d’amélioration continue de la SAR.

Documents de référence analysés :
- PRD.md
- TRD.md
- Plan_implementation.md
- uxui_design.md
- sp_cification_technique_base_de_donn_es_p13.md
- colors.css

## 2. Environnement de travail vérifié

- Dossier racine : `D:\A3`
- Backend Laravel : `D:\A3\backend`
- Frontend React/Vite : `D:\A3\frontend`
- Base de données prévue : PostgreSQL
- Authentification prévue : Laravel Sanctum + cookies SPA
- Stack : Laravel 13 + React 19 + PostgreSQL + Vite + Material UI

## 3. Palette SAR appliquée

Couleurs de référence issues de `colors.css` :
- Brand : `#E60012` / `#B8000E` / `#8F000B`
- Fond : `#F7F7F8`
- Contours : `#E5E5E8` / `#D2D2D8`
- Texte principal : `#1A1A1F`
- Texte secondaire : `#6B6B76`
- Succès : `#167A4A`
- Erreur : `#C62828`
- Avertissement : `#8A5A00`
- Information : `#1D4ED8`

## 4. Principes de conception retenus

- Interface desktop PC uniquement, largeur minimum 1280 px
- Interface en français
- Menu latéral + barre supérieure commune
- Theme SAR appliqué via variables CSS centralisées
- Sécurité métier contrôlée côté backend
- Historique immuable
- Fichiers / PDF / PDF A3 généré côté serveur
- Workflow de fiche structuré en étapes et validations

## 5. Point de départ technique

### Backend

Base de données construite sur le socle métier suivant :
- utilisateurs (`users` Laravel, avec les champs SAR intégrés à la migration initiale)
- rôles
- unités
- affectations
- listes et valeurs de référentiels
- équipements et références SAP
- fiches A3, domaines, indicateurs et mesures
- impacts, causes, actions, risques, gains, pérennisation et leçons
- contrôles, validations, commentaires, pièces jointes et relances
- historique métier immuable, notifications métier, paramètres et journal d’administration

### Frontend

Les visuels et composants de démonstration Elegent (ventes, produits, avatars et photos)
ont été retirés. L’application dispose maintenant d’une ossature SAR : routes React Router,
coque de navigation, thème Material UI aux couleurs SAR, primitives UI partagées,
pages placeholder, structure des 12 sections et onglets de la fiche.
Les pages et composants sont des squelettes : aucune authentification, règle de rôle,
donnée métier ou API n’est encore branchée.

## 6. Plan de travail actuel

### Étape 1 – Base de données (révisée et validée)

- Vérification de la structure Laravel existante
- Séparation stricte du schéma A3 en migrations indépendantes par table / thématique
- Champs SAR intégrés à la migration de création `users` ; aucune migration additive `alter_users`
- Conservation des tables Laravel `password_reset_tokens` et `sessions`
- Conservation de `references_sap`
- Notifications Laravel database dans `notifications` et notifications métier isolées dans `notifications_metier`
- Contraintes de suppression restrictives sur les liens métier afin de préserver les historiques ; privilégier la désactivation des comptes et référentiels
- Historique protégé contre `UPDATE` et `DELETE` par PostgreSQL et par le modèle Eloquent
- Nettoyage défensif de la fonction PostgreSQL du trigger, car `migrate:fresh` supprime les tables mais peut laisser la fonction seule

### Ordre des migrations validé

1. `0001_01_01_000000_create_users_table`
2. `0001_01_01_000001_create_cache_table`
3. `0001_01_01_000002_create_jobs_table`
4. `0001_01_01_000003_create_password_reset_tokens_table`
5. `0001_01_01_000004_create_sessions_table`
6. `0001_01_01_000005_create_notifications_table`
7. `2026_10_12_161946_create_personal_access_tokens_table`
8. `2026_10_13_000001_create_roles_table`
9. `2026_10_13_000002_create_unites_table`
10. `2026_10_13_000003_create_listes_table`
11. `2026_10_13_000004_create_valeurs_listes_table`
12. `2026_10_13_000005_create_equipements_table`
13. `2026_10_13_000006_create_affectations_table`
14. `2026_10_13_000007_create_fiches_a3_table`
15. `2026_10_13_000008_create_fiche_domaines_table`
16. `2026_10_13_000009_create_indicateurs_table`
17. `2026_10_13_000010_create_mesures_table`
18. `2026_10_13_000011_create_references_sap_table`
19. `2026_10_13_000012_create_compteurs_fiches_table`
20. `2026_10_13_000013_create_impacts_table`
21. `2026_10_13_000014_create_causes_table`
22. `2026_10_13_000015_create_risques_table`
23. `2026_10_13_000016_create_actions_table`
24. `2026_10_13_000017_create_gains_table`
25. `2026_10_13_000018_create_perennisation_table`
26. `2026_10_13_000019_create_lecons_table`
27. `2026_10_13_000020_create_controles_table`
28. `2026_10_13_000021_create_validations_table`
29. `2026_10_13_000022_create_evenements_historique_table`
30. `2026_10_13_000023_create_commentaires_table`
31. `2026_10_13_000024_create_pieces_jointes_table`
32. `2026_10_13_000025_create_notifications_metier_table`
33. `2026_10_13_000026_create_relances_table`
34. `2026_10_13_000027_create_parametres_table`
35. `2026_10_13_000028_create_journal_administration_table`

### Étape 2 – Frontend / structure SAR

- suppression des photos, avatars, produits, graphiques et modules d’exemple Elegent
- préparation des routes publiques, métier, administration et erreurs avec React Router
- classement des pages par domaine (`auth`, `dashboard`, `fiches`, `workflow`, `admin`, `system`), chacune avec son CSS dédié
- déplacement du composant placeholder partagé dans `components/common`
- coque SAR (navigation latérale, fil d’Ariane, profil actif et cloche placeholder)
- thème Material UI initialisé depuis la palette SAR ; variables CSS préservées
- composants partagés pour boutons, champs, badges, alertes, KPI, tableau, état vide et sauvegarde
- CSS voisin pour chaque composant présentant une interface ; les composants de délégation réutilisent les styles du composant visuel partagé
- dossiers fiche : en-tête, navigation, 12 sections et onglets liés
- pages créées comme placeholders, sans appels API ni règles métier

### Étape 3 – Workflow métier

- fiches A3
- transitions de statut
- validation par porte
- contrôles J+30 / J+60 / J+90
- gains FCFA

### Étape 4 – Finitions

- notifications
- relances
- export PDF
- tests
- revue finale

## 7. Statut actuel

- Analyse documentaire terminée.
- Environnement de travail validé.
- Palette SAR identifiée et transposée dans le code.
- Schéma révisé reconstruit et seedé avec `php artisan migrate:fresh --seed`.
- Tests Laravel : 2 tests réussis, 2 assertions.
- Vérification des tables/champs `$fillable` sur les 29 modèles métier : réussie.
- Vérification de la séparation effective des relations de notification : `notifications` Laravel / `notifications_metier` métier.
- Vérification syntaxique PHP : 64 fichiers modèles et migrations valides.
- L’ordre des migrations vérifié, notamment risques avant actions.
- Les migrations standards de réinitialisation de mot de passe et sessions Laravel sont conservées.
- Structure frontend SAR créée et vérifiée avec `npm run build` et `npm run lint`.
- Le frontend reste une ossature : les API, l’authentification/protection des routes, les droits par profil et le contenu métier sont les prochaines étapes.

## 8. Décisions d’implémentation

- Utiliser PostgreSQL conformément au PRD.
- Garder le backend Laravel comme source de vérité métier.
- Utiliser `#[Fillable]` comme source unique de remplissage déclaratif sur `User`.
- Séparer les notifications métier (`notifications_metier`) des notifications Laravel (`notifications`).
- Conserver les jetons Laravel de réinitialisation et les références SAP.
- Centraliser le thème dans des variables CSS pour éviter les couleurs du template.
- Éviter le couplage UI/back au niveau des règles métier.
- Préparer une base de données extensible pour les règles de workflow et de visibilité.
