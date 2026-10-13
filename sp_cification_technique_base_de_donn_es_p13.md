# Spécification Technique Complète - Base de Données P13 (SAR)

Ce document fournit la structure détaillée de la base de données PostgreSQL pour l'application **P13** de la Société Africaine de Raffinage (SAR). Il est conçu pour guider les outils de génération de code, les ORM (ex: Laravel Eloquent) et les scripts de migration.

---

## 1. Conventions Générales & Directives
- **SGBD :** PostgreSQL (version 14+ recommandée).
- **Clés primaires :** De type `BIGSERIAL` (ou `BIGINT` auto-incrémenté) pour toutes les tables principales.
- **Horodatage :** Champs `created_at` et `updated_at` de type `TIMESTAMP WITH TIME ZONE` par défaut.
- **Immuabilité & Soft Deletes :** Utilisation d'un champ `actif` (`BOOLEAN DEFAULT TRUE`) pour la désactivation logique lorsque nécessaire, et interdiction absolue de modification sur l'historique métier via un `TRIGGER`.
- **Montants financiers :** Stockés en `BIGINT` (représentant les francs CFA, sans décimales).

---

## 2. Structure Détaillée des Tables par Module

### A. Module Utilisateurs, Rôles et Affectations

#### 1. Table `users`
Stocke les comptes utilisateurs (locaux ou synchronisés via LDAP).
- `id` : `BIGSERIAL` (PK)
- `name` : `VARCHAR(255)` (Nom complet)
- `email` : `VARCHAR(255)` (UNIQUE, non null)
- `password` : `VARCHAR(255)` (Nullable pour les comptes purement LDAP)
- `auth_provider` : `VARCHAR(50)` (Ex: 'local', 'ldap')
- `ldap_guid` : `VARCHAR(255)` (Nullable, identifiant unique LDAP)
- `actif` : `BOOLEAN` (DEFAULT TRUE)
- `last_login_at` : `TIMESTAMP WITH TIME ZONE` (Nullable)
- `timestamps` (`created_at`, `updated_at`)

#### 2. Table `roles`
Définit les rôles applicatifs globaux ou spécifiques.
- `id` : `BIGSERIAL` (PK)
- `code` : `VARCHAR(100)` (UNIQUE, ex: 'PILOTE', 'VALIDEUR_PROD', 'ADMIN_FONCTIONNEL', 'CONTROLE_GESTION', 'DIRECTION')
- `libelle` : `VARCHAR(255)`
- `description` : `TEXT` (Nullable)
- `timestamps`

#### 3. Table `unites`
Représente les entités organisationnelles ou unités de production.
- `id` : `BIGSERIAL` (PK)
- `code` : `VARCHAR(50)` (UNIQUE)
- `libelle` : `VARCHAR(255)`
- `actif` : `BOOLEAN` (DEFAULT TRUE)
- `timestamps`

#### 4. Table `affectations`
Table d'association flexible liant un utilisateur à un rôle et optionnellement à une unité (gestion des périmètres).
- `id` : `BIGSERIAL` (PK)
- `user_id` : `BIGINT` (FK vers `users.id`, ON DELETE CASCADE)
- `role_id` : `BIGINT` (FK vers `roles.id`, ON DELETE CASCADE)
- `unite_id` : `BIGINT` (FK vers `unites.id`, NULLABLE si rôle global)
- `actif` : `BOOLEAN` (DEFAULT TRUE)
- `timestamps`
- *Index unique :* `(user_id, role_id, unite_id)`

---

### B. Module Référentiels & SAP

#### 5. Table `equipements`
- `id` : `BIGSERIAL` (PK)
- `code` : `VARCHAR(100)` (UNIQUE, ex: code repérage SAP)
- `libelle` : `VARCHAR(255)`
- `unite_id` : `BIGINT` (FK vers `unites.id`, Nullable)
- `actif` : `BOOLEAN` (DEFAULT TRUE)
- `timestamps`

#### 6. Table `references_sap`
Références externes vers les avis, ordres ou coûts SAP.
- `id` : `BIGSERIAL` (PK)
- `type_reference` : `VARCHAR(50)` (Ex: 'AVIS', 'ORDRE_TRAVAUX')
- `valeur` : `VARCHAR(100)` (Numéro SAP)
- `libelle` : `VARCHAR(255)` (Nullable)
- `timestamps`

#### 7. Table `listes` et `valeurs_listes`
Gestion centralisée des listes de choix paramétrables (origines, causes types, etc.).
- `listes` : `id` (PK), `code` (VARCHAR, UNIQUE), `libelle` (VARCHAR)
- `valeurs_listes` : `id` (PK), `liste_id` (FK vers `listes.id`), `code` (VARCHAR), `libelle` (VARCHAR), `ordre` (INTEGER), `actif` (BOOLEAN)

#### 8. Table `compteurs_fiches`
Gère la génération incrémentale annuelle des numéros `A3-AAAA-NNN`.
- `annee` : `INTEGER` (PK)
- `dernier_numero` : `INTEGER` (DEFAULT 0)

---

### C. Module Cœur Fiche A3

#### 9. Table `fiches_a3`
Table centrale regroupant les informations maîtresses de la fiche A3.
- `id` : `BIGSERIAL` (PK)
- `numero` : `VARCHAR(50)` (UNIQUE, format `A3-AAAA-NNN`)
- `titre` : `VARCHAR(255)`
- `origine_id` : `BIGINT` (FK vers `valeurs_listes.id`)
- `enonce_probleme` : `TEXT`
- `unite_id` : `BIGINT` (FK vers `unites.id`)
- `equipement_id` : `BIGINT` (FK vers `equipements.id`, Nullable)
- `pilote_id` : `BIGINT` (FK vers `users.id`, Nullable)
- `statut` : `VARCHAR(50)` (CHECK: 'OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE')
- `etape_workflow` : `VARCHAR(50)` (Ex: 'DECLARATION', 'PRISE_EN_CHARGE', 'PLAN_ACTIONS', 'REALISATION', 'VERIFICATION', 'CLOTURE')
- `confidentialite` : `VARCHAR(20)` (CHECK: 'NORMAL', 'RESTREINT', DEFAULT 'NORMAL')
- `version` : `INTEGER` (DEFAULT 1)
- `created_by` : `BIGINT` (FK vers `users.id`)
- `timestamps`

#### 10. Table `fiche_domaines`
Domaines impactés cochés sur la fiche (QHSE, Procédé, Fiabilité, Intégrité, Sûreté) pour router les valideurs métier.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `domaine_code` : `VARCHAR(50)` (Ex: 'QHSE', 'PROCEDE', 'FIABILITE', 'INTEGRITE', 'SURETE')
- `timestamps`

#### 11. Table `impacts`
Analyse initiale des impacts.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `type_impact` : `VARCHAR(50)` (Ex: 'SECURITE', 'ENVIRONNEMENT', 'PRODUCTION', 'COUT')
- `description` : `TEXT`
- `niveau` : `VARCHAR(50)` (Nullable)
- `timestamps`

#### 12. Table `indicateurs` et `mesures`
Suivi des indicateurs avant/après.
- `indicateurs` : `id` (PK), `fiche_a3_id` (FK), `libelle` (VARCHAR), `unite_mesure` (VARCHAR)
- `mesures` : `id` (PK), `indicateur_id` (FK vers `indicateurs.id`), `type_mesure` (CHECK: 'REFERENCE', 'CIBLE', 'ACTUELLE', 'APRES'), `valeur` : `DECIMAL(15,4)`, `date_mesure` : `DATE`, `timestamps`

#### 13. Table `causes`
Arbre ou analyse des causes racines.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `cause_parente_id` : `BIGINT` (FK vers `causes.id`, Nullable, pour arborescence)
- `libelle` : `TEXT`
- `type_cause` : `VARCHAR(50)` (Ex: 'METHODE', 'MATERIEL', 'MAIN_OEUVRE', 'MILIEU', 'MATIERE')
- `timestamps`

#### 14. Table `actions`
Plan d'actions correctives et préventives.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `libelle` : `TEXT`
- `responsable_id` : `BIGINT` (FK vers `users.id`)
- `date_echeance` : `DATE`
- `statut` : `VARCHAR(50)` (CHECK: 'A_FAIRE', 'EN_COURS', 'REALISE', 'ANNULE')
- `moc_requis` : `BOOLEAN` (DEFAULT FALSE, Gestion du Changement B1)
- `reference_moc` : `VARCHAR(100)` (Nullable)
- `timestamps`

#### 15. Table `risques`
Analyse des risques liés aux actions.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `description` : `TEXT`
- `criticite` : `VARCHAR(50)`
- `mesure_mitigation` : `TEXT`
- `timestamps`

---

### D. Module Gains, Pérennisation & Contrôles

#### 16. Table `gains`
Évaluation et validation des gains économiques.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `montant_estime` : `BIGINT` (En FCFA)
- `montant_valide` : `BIGINT` (En FCFA, validé par le Contrôle de gestion)
- `statut_validation` : `VARCHAR(50)` (CHECK: 'EN_ATTENTE', 'VALIDE', 'REFUSE')
- `commentaire_controle_gestion` : `TEXT` (Nullable)
- `timestamps`

#### 17. Table `perennisation` et `lecons`
- `perennisation` : `id` (PK), `fiche_a3_id` (FK), `description_standardisation` (TEXT), `statut` (VARCHAR)
- `lecons` : `id` (PK), `fiche_a3_id` (FK), `retex` (TEXT)

#### 18. Table `controles`
Audits d'efficacité à $J+30$, $J+60$ et $J+90$ jours (règle B4).
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `jalon` : `VARCHAR(20)` (CHECK: 'J_30', 'J_60', 'J_90')
- `date_prevue` : `DATE`
- `date_realisation` : `DATE` (Nullable)
- `conforme` : `BOOLEAN` (Nullable)
- `commentaires` : `TEXT` (Nullable)
- `auditeur_id` : `BIGINT` (FK vers `users.id`, Nullable)
- `timestamps`

---

### E. Module Validation & Workflow

#### 19. Table `validations`
Enregistre l'historique des Portes de validation (Porte 1 : Plan, Porte 2 : Clôture/Gains).
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `porte` : `INTEGER` (CHECK: 1 ou 2)
- `domaine_concerne` : `VARCHAR(50)` (Nullable, ex: 'PRODUCTION', 'QHSE', etc.)
- `user_id` : `BIGINT` (FK vers `users.id`, valideur)
- `decision` : `VARCHAR(50)` (CHECK: 'VALIDE', 'REFUSE', 'EN_ATTENTE')
- `commentaire` : `TEXT` (Nullable)
- `version_fiche` : `INTEGER`
- `timestamps`

---

### F. Traçabilité, Outils & Sécurité

#### 20. Table `evenements_historique`
Traçabilité métier immuable de tous les changements sur les fiches A3.
- `id` : `BIGSERIAL` (PK)
- `fiche_a3_id` : `BIGINT` (FK vers `fiches_a3.id`, ON DELETE CASCADE)
- `user_id` : `BIGINT` (FK vers `users.id`, auteur de l'action)
- `action_type` : `VARCHAR(100)` (Ex: 'CREATION', 'MODIFICATION_CHAMP', 'CHANGEMENT_STATUT', 'VALIDATION_PORTE')
- `ancien_etat` : `JSONB` (Nullable)
- `nouvel_etat` : `JSONB` (Nullable)
- `created_at` : `TIMESTAMP WITH TIME ZONE` (Pas de `updated_at` pour garantir l'immuabilité)

#### 21. Tables Transversales
- **`commentaires`** : `id` (PK), `fiche_a3_id` (FK), `user_id` (FK), `contenu` (TEXT), `timestamps`
- **`pieces_jointes`** : `id` (PK), `fiche_a3_id` (FK), `user_id` (FK), `nom_original` (VARCHAR), `chemin_stockage` (VARCHAR), `taille` (BIGINT), `mime_type` (VARCHAR), `timestamps`
- **`notifications`** : `id` (PK), `user_id` (FK), `titre` (VARCHAR), `message` (TEXT), `lu` (BOOLEAN DEFAULT FALSE), `timestamps`
- **`relances`** : `id` (PK), `fiche_a3_id` (FK), `expediteur_id` (FK), `destinataire_id` (FK), `date_relance` (TIMESTAMP), `timestamps` (Utilisé pour la règle d'unicité de 1 relance / 24h).
- **`parametres`** : `id` (PK), `cle` (VARCHAR, UNIQUE), `valeur` (TEXT), `timestamps`
- **`journal_administration`** : `id` (PK), `user_id` (FK), `action` (VARCHAR), `details` (JSONB), `created_at`
- **`jetons_reinitialisation`** : `id` (PK), `email` (VARCHAR), `token` (VARCHAR), `created_at`

---

## 3. Triggers et Sécurité Avancée (PostgreSQL)

Pour garantir l'intégrité et l'immuabilité au niveau SGBD :
1. **Trigger d'immuabilité sur `evenements_historique` :** Un trigger doit lever une exception SQL si un `UPDATE` ou un `DELETE` est tenté sur la table `evenements_historique`.
2. **Verrouillage transactionnel (`SELECT ... FOR UPDATE`) :** À implémenter dans les services de transition de workflow pour éviter les conflits de concurrence (gérant le code HTTP 409).