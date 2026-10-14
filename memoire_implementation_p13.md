# Mémoire de projet — P13 / Fiche A3 SAR

Dernière mise à jour : 14 octobre 2026 (jour 2 du calendrier, démonstration prévue le 30 octobre).

## Sommaire

1. Contexte et références
2. Environnement
3. Démarrage rapide
4. Architecture
5. Avancement par étape
6. Données de démonstration
7. Tests
8. Décisions d'implémentation
9. Écarts avec les documents de référence
10. Reste à faire
11. Points de vigilance

---

## 1. Contexte et références

Numérisation de la fiche A3 d'amélioration continue de la SAR : déclaration, fiche en 12 sections, workflow à deux portes de validation, actions et MOC, contrôles d'efficacité J+30/60/90, gains en FCFA, historique immuable.

Documents de référence (la priorité va au PRD en cas de conflit) :

| Document | Rôle |
|---|---|
| `PRD.md` | Règles métier, matrice des droits (§2.3), visibilité (§2.4), workflow T1–T13 et B1–B8 (§5), modèle de données (§12) |
| `TRD.md` | Architecture, API, sécurité, installation |
| `Plan_implementation.md` | Calendrier du 13 au 30 octobre, lots L0 à L14 |
| `uxui_design.md` | Écrans, charte, structure du code |
| `SAR · Fiches A3 — Démo.html` | Maquette visuelle de référence |
| `sp_cification_technique_base_de_donn_es_p13.md`, `colors.css` | Schéma et palette |

## 2. Environnement

| Élément | Valeur |
|---|---|
| Racine | `D:\A3` (`backend/` Laravel 13, `frontend/` React 19 + Vite 8 + Material UI) |
| Base | PostgreSQL 18.6 locale, base `fiche_a3` (application et tests) |
| Authentification | Laravel Sanctum en mode SPA (session, cookies, CSRF) |
| Session | 30 minutes d'inactivité |
| Courriel | transport `log` en démonstration |

Palette SAR (`colors.css`, copiée dans `frontend/src/theme/colors.css`) : marque `#E60012` / `#B8000E` / `#8F000B`, fond `#F7F7F8`, contours `#E5E5E8` / `#D2D2D8`, texte `#1A1A1F` / `#6B6B76`, succès `#167A4A`, erreur `#C62828`, avertissement `#8A5A00`, information `#1D4ED8`, plus les couleurs d'étape `--st-*`, d'action `--action-*` et de confidentialité `--conf-*`.

## 3. Démarrage rapide

```bash
# Backend
cd backend
php artisan migrate:fresh --seed   # recrée la base ET les données de démonstration
php artisan serve                  # http://127.0.0.1:8000

# Frontend
cd frontend
npm run dev                        # http://127.0.0.1:5173 (proxy /api et /sanctum vers Laravel)

# Vérifications
php artisan test --compact         # backend
npm run lint && npm run build      # frontend
```

Mot de passe de tous les comptes de démonstration : `Azerty123` (liste en §6).

## 4. Architecture

### 4.1 Backend (`backend/app`)

| Dossier | Contenu |
|---|---|
| `Enums/` | `StatutEtape` (9 étapes + statut général), `StatutAction`, `Domaine` (avec le rôle valideur de chaque domaine) |
| `Services/` | Règles métier (tableau ci-dessous) |
| `Http/Controllers/` | `AuthController`, `Admin/*` (un contrôleur par écran d'administration), `TechniqueController`, `FicheController`, `WorkflowController`, `CommentaireController`, `ReferentielController`, `NotificationController`, `TableauDeBordController` ; trait `ResolvesVisibleFiche` |
| `Http/Middleware/` | `EnsureActiveRole:<ROLE>` (rôle de l'affectation active) |
| `Http/Resources/` | `FicheResource` (12 sections, calculs, complétude, droits du profil actif) |
| `Exceptions/` | `RegleMetierException` (403, 409, 422 avec liste `manques`) |
| `config/a3.php` | `auth_provider` (`local`), `sap_enabled` (faux) |

| Service | Responsabilité |
|---|---|
| `ActiveProfile` | Affectation active en session (`auth.active_assignment_id`) |
| `FicheVisibility` | Portée des fiches (PRD §2.4) ; une fiche hors portée renvoie 404 |
| `FicheWorkflow` | Seul code qui change l'étape : T1–T13, transaction + `lockForUpdate`, 409 / 422 |
| `ValidationCircuit` | Portes 1 et 2, titulaires (unité puis global, jamais le pilote), B7, empreinte des signatures |
| `FicheSectionService` | Enregistrement des sections 1 à 11 par le pilote, selon l'étape, historique champ par champ |
| `FicheSectionRules` | Format attendu des champs de chaque section (validation Laravel) |
| `ActionService` | Statuts d'action, B1 (MOC), motifs, blocage et reprise, actions correctives |
| `ControleEfficaciteService` | Contrôles J+30/60/90, contrôle correctif à 30 jours, B4 |
| `Calculs` | Formules PRD §6.2 ; `null` = « Non calculable » |
| `HistoryLogger`, `NotificationService` | Historique métier immuable, notifications internes |
| `TechnicalSettingsService` | Paramètres SMTP (liste blanche, mot de passe chiffré) |

### 4.2 API (préfixe `/api`, sans version)

| Domaine | Routes |
|---|---|
| Authentification | `POST /auth/connexion`, `/auth/deconnexion`, `/auth/profil-actif`, `/auth/mot-de-passe-oublie`, `/auth/mot-de-passe` ; `GET /auth/moi` |
| Administration fonctionnelle (`ADMIN_FONCTIONNEL`) | `/admin/users`, `/admin/assignments`, `/admin/units`, `/admin/equipment`, `/admin/lists`, `/admin/settings`, `/admin/roles`, `/admin/fiches` (pilote et confidentialité seulement) |
| Administration technique (`ADMIN_TECHNIQUE`) | `GET /technique`, `PUT /technique/settings` |
| Fiches | `GET/POST /fiches`, `GET /fiches/{id}`, `PUT /fiches/{id}/sections/{n}`, `POST /fiches/{id}/transitions`, `POST /fiches/{id}/confidentialite`, `GET /fiches/{id}/historique`, `GET /fiches/{id}/options`, `GET/POST /fiches/{id}/commentaires` |
| Workflow | `GET /validations`, `POST /validations/{id}/decision`, `POST /actions/{id}/statut`, `PATCH /controles/{id}`, `POST /gains/{id}/decision` |
| Transversal | `GET /referentiels`, `GET /tableau-de-bord`, `GET /notifications`, `GET /notifications/non-lues`, `POST /notifications/{id}/lu`, `POST /notifications/tout-lu` |

### 4.3 Base de données

36 migrations : les 35 du socle (utilisateurs, rôles, unités, affectations, listes, équipements, fiches et leurs tables liées, contrôles, validations, historique, commentaires, pièces jointes, notifications métier, relances, paramètres, journal d'administration) et la migration additive `2026_10_14_132254_add_contenu_columns_to_fiches_a3_table` (champs des sections 2, 4, 5 et 8, mise en attente, statut avant blocage, contraintes CHECK, décision `ANNULE`).

Principes : suppressions restrictives (désactivation plutôt que suppression), historique protégé contre `UPDATE` et `DELETE` par un déclencheur PostgreSQL et par le modèle, notifications Laravel (`notifications`) séparées des notifications métier (`notifications_metier`).

### 4.4 Frontend (`frontend/src`)

| Dossier | Contenu |
|---|---|
| `auth/` | `api.js` (cookies, CSRF, option `passive`), `AuthContext`, `ProtectedLayout`, `RequireRole` |
| `services/` | `ficheService.js`, `notificationService.js` |
| `hooks/` | `useCounters` (compteurs de la coque, toutes les 60 s) |
| `utils/` | `constants.js` (étapes, rôles, transitions), `format.js` (FCFA, dates Africa/Dakar), `toast.js`, `crumb.js` |
| `components/common/` | `Button`, `Icon`, `Alert`, `StatusBadge`, `ConfirmDialog`, `FormControls`, `DataTable`, `ToastHost`… |
| `components/layout/` | `AppLayout`, `Sidebar`, `Topbar`, `NotificationBell`, `ProfileSwitcher`, `AuthPage`, `A3Sheet` |
| `components/fiche/` | `FicheHeader`, `FicheTabs`, `SectionStepper`, `SectionEditor`, `WorkflowActions`, `MissingConditionsPanel`, `sections/` (12 sections, `sectionModel.js`, `RowsEditor`), `tabs/` (Actions, Contrôles, Validations, Pièces jointes, Commentaires, Historique) |
| `pages/` | `auth/`, `dashboard/`, `fiches/`, `workflow/`, `admin/`, `system/`, `Technique.jsx` |

## 5. Avancement par étape

### Étape 1 — Base de données ✅

Schéma complet en migrations séparées, champs SAR dans la migration `users`, tables Laravel de réinitialisation et de session conservées, déclencheur d'historique avec nettoyage défensif de sa fonction.

### Étape 2 — Socle frontend ✅

Template Elegent nettoyé, routes React Router publiques, métier, administration et erreurs, coque SAR, thème Material UI depuis la palette, composants partagés, un fichier CSS par composant.

### Étape 2 bis — Authentification et profils ✅

- Connexion locale par identifiant et mot de passe (Sanctum SPA), restauration de session, expiration après 30 minutes d'inactivité.
- 5 échecs en 15 minutes par identifiant et par adresse ; message identique pour un identifiant inconnu et un mauvais mot de passe.
- Profil actif en session, changement de profil, redirection vers `/tableau-de-bord` (ou `/technique` pour l'administrateur technique).
- Menu filtré par le rôle actif (UX §5). Aucune inscription publique.

### Étape 2 ter — Administration fonctionnelle ✅

Comptes (création sans mot de passe, lien de définition), affectations, unités, équipements, valeurs des listes (ordre modifiable), paramètres fonctionnels ; registre des fiches limité à la désignation du pilote (étape Ouvert, pilote de l'unité) et à la confidentialité. Journal d'administration pour chaque modification. La désignation du pilote écrit aussi l'historique métier et notifie le pilote.

### Étape 2 quater — Administration technique et sécurité ✅

Corrections de sécurité du 14 octobre :
- **Faille corrigée** : l'API `/api/admin/*` n'avait que `auth:sanctum`, donc tout compte connecté y avait accès. Elle est maintenant protégée par `EnsureActiveRole:ADMIN_FONCTIONNEL`.
- `/api/technique/*` lisait une clé de session inexistante : `EnsureActiveRole:ADMIN_TECHNIQUE` le remplace.
- Route Laravel par défaut `GET /api/user` supprimée.
- Mot de passe PostgreSQL retiré de `.env.example` (il reste dans l'historique Git, commit `2219fc9`).
- Le frontend plantait au chargement (`Technique` non importé dans `App.jsx`, import `G` inexistant) : corrigé.

Administration technique : fournisseur d'authentification et SAP en lecture seule (`config/a3.php`), paramètres SMTP sur liste blanche, mot de passe SMTP chiffré, jamais renvoyé et masqué dans le journal. Rôle `ADMIN_TECHNIQUE` ajouté aux seeders.

### Étape 3 — Fiche A3 et workflow ✅

Prérequis corrigés :
- Rôles valideurs par domaine : `VALIDEUR_HSE`, `VALIDEUR_PROCEDE`, `VALIDEUR_MAINTENANCE`, `VALIDEUR_INSPECTION`, en plus de `VALIDEUR_PRODUCTION` (« Production / Exploitation »).
- Codes des listes corrompus par `iconv` sous Windows (`S_ECURIT_E_HSE`…) : `Str::ascii`, renommage en place. Domaines alignés sur la contrainte CHECK. Types d'action provisoires : Corrective, Préventive, Amélioration.

Livré :
- Déclaration en une étape, numéro `A3-AAAA-NNN` sous verrou, remis à 001 chaque année.
- 12 sections enregistrées explicitement par le pilote, selon l'étape, avec complétude et état de sauvegarde.
- Workflow complet T1 à T13 et règles B1 à B8, avec liste des conditions manquantes (422) et conflits (409).
- Porte 1 : Production / Exploitation d'abord, puis domaines cochés en parallèle. Porte 2 : Contrôle de gestion (si gains, validation ligne par ligne), puis Direction. Signatures conservées tant que le contenu du domaine ne change pas.
- Actions (MOC bloquant, annulation et blocage motivés, reprise), contrôles J+30/60/90, action corrective vérifiée à 30 jours, gains calculés en FCFA entiers.
- Registre (recherche, filtres, tri, pagination), écran de fiche avec onglets, page « Validations à traiter ».

### Étape 3 bis — Interface alignée sur la maquette ✅

- Socle visuel : cartes arrondies, ombres douces, en-têtes de tableau en capitales, pastilles à point, icônes au trait, toasts noirs en bas à droite.
- Coque : compteurs dans le menu (validations, notifications), recherche en pilule, fil d'Ariane « Fiches › A3-… », cloche avec les cinq dernières notifications. Les compteurs sont interrogés toutes les 60 s sans prolonger la session (`passive: true`).
- Tableau de bord par profil : bandeau « priorités du jour », quatre cartes propres au rôle, barres par étape, liste « À traiter » ; calculé côté serveur dans la limite de la visibilité.
- Notifications : API et page (« Non lu », « Tout marquer comme lu »).
- Fiche : en-tête fixe, frise de progression, historique et validations en frise, commentaires avec avatars, retards en rouge avec horloge.

### Étape 3 ter — Page de connexion ✅

Refonte autour de la fiche A3 elle-même (`AuthPage`, `A3Sheet`, `Login`) :
- à gauche, papier quadrillé d'ingénierie et une fiche A3 dessinée au format paysage (√2), sections 1–6 et 7–12, cartouche technique (N°, unité, pilote, format) ; les sections se remplissent dans l'ordre au chargement (animation désactivée si l'utilisateur réduit les animations) ;
- à droite, formulaire sobre : identifiant, mot de passe avec bouton d'affichage, lien « Mot de passe oublié ? » sur la ligne du libellé, bouton pleine largeur inactif tant que les champs sont vides, messages avec icône (identifiants incorrects, trop de tentatives avec délai, session expirée) ;
- même gabarit pour « Mot de passe oublié » (avec retour à la connexion) et « Réinitialisation » ; aucune ressource externe.

### Étape 3 quater — Simplification du backend ✅

- Fichiers d'exemple Laravel retirés (page d'accueil, Vite et Tailwind du backend, tests d'exemple).
- Scope `Affectation::enCours()` : une seule définition d'une affectation valable aujourd'hui (6 copies supprimées) ; le middleware `EnsureActiveRole` s'appuie sur `ActiveProfile`. Corrige au passage la liste des titulaires de `FicheController`, qui ignorait les dates.
- `ActiveProfile::estPiloteDe($fiche)` remplace 8 copies du test « pilote désigné ».
- Statuts tirés des enums : `StatutAction::terminees()`, `StatutEtape::etapesDeSuivi()`.
- `FicheWorkflow` ne contient plus que les transitions : numérotation dans `CompteurFiche::prochainNumero()`, décision sur un gain dans `ValidationCircuit::deciderGain()`.
- Une seule convention d'erreur : champ invalide → validation Laravel ; règle métier → `RegleMetierException`.
- `AdminController` (700 lignes) découpé en un contrôleur par écran dans `Http/Controllers/Admin/` : `UserController`, `AffectationController`, `UniteController`, `EquipementController`, `ListeController`, `ParametreController`, `FicheAdminController`, sur une base commune `AdminController` (journal d'administration). Les 23 routes `/api/admin/*` sont inchangées.
- Règles de validation des 11 sections sorties de `FicheSectionService` (614 → 480 lignes) dans `FicheSectionRules` : la forme des champs d'un côté, les règles métier de l'autre.

### Étape 4 — Finitions ⏳

Voir §10.

## 6. Données de démonstration

Recréées par `php artisan migrate:fresh --seed` (environnement `local`).

**Unités et équipements** : DIST (Distillation atmosphérique), REF (Reformage catalytique), UTIL (Utilités) ; 10 équipements (P-201, F-101, E-104, V-310, K-301, R-401, E-420, T-02, P-650, L-12).

**Comptes** : 22 comptes, deux par rôle. Le premier compte d'un rôle d'unité est affecté à DIST, le second à REF et UTIL (deux profils, utile pour le sélecteur). Les autres rôles sont globaux.

| Rôle | Compte 1 | Compte 2 |
|---|---|---|
| Agent | `agent.demo` | `agent2.demo` |
| Pilote | `pilote.demo` | `pilote2.demo` |
| Valideur Production / Exploitation | `valideur.demo` | `valideur2.demo` |
| Valideur HSE | `valideur-hse.demo` | `valideur-hse2.demo` |
| Valideur Procédé / Technique | `valideur-procede.demo` | `valideur-procede2.demo` |
| Valideur Maintenance | `valideur-maintenance.demo` | `valideur-maintenance2.demo` |
| Valideur Inspection / Intégrité | `valideur-inspection.demo` | `valideur-inspection2.demo` |
| Contrôle de gestion | `controle.demo` | `controle2.demo` |
| Direction | `direction.demo` | `direction2.demo` |
| Administrateur fonctionnel | `admin-fonctionnel.demo` | `admin-fonctionnel2.demo` |
| Administrateur technique | `admin-technique.demo` | `admin-technique2.demo` |

**Fiches** (`DemoFichesSeeder`) : 15 fiches simulées en passant par les vrais services, en remontant jusqu'à 175 jours dans le temps. L'historique, les validations, les contrôles et les notifications sont donc cohérents.

| N° | Étape | Scénario |
|---|---|---|
| 001, 002 | Clôturé | Gains validés |
| 003 | Clôturé | Sans gain chiffré |
| 004 | En validation de clôture | Gains à valider par `controle.demo`, puis `direction.demo` |
| 005 | Vérification du maintien | Contrôle J+90 disponible |
| 006 | Vérification du maintien | J+60 non conforme, action corrective en cours |
| 007 | Mesure des résultats | Mesure Après à saisir |
| 008 | Réalisation des actions | Action bloquée par un MOC non clôturé (B1) |
| 009 | En attente (Restreint) | Blocage à lever |
| 010 | En validation du plan | `valideur-hse.demo` doit décider |
| 011 | En validation du plan | `valideur2.demo` doit décider |
| 012 | En cours | Plan refusé, à resoumettre |
| 013 | En cours (Restreint) | Brouillon partiel |
| 014 | Ouvert | Pilote désigné, analyse à commencer |
| 015 | Ouvert | Sans pilote |

## 7. Tests

86 tests, 1 109 assertions, sur PostgreSQL, isolés par transactions (aucune table créée ni supprimée par les tests).

| Fichier | Couverture |
|---|---|
| `AuthSessionTest` | Connexion, limitation, profils, session |
| `AdminAdministrationTest` | Administration fonctionnelle, accès réservé |
| `TechnicalAdministrationTest` (5) | Accès réservé, SMTP chiffré et masqué, liste blanche |
| `FicheWorkflowTest` (9) | Parcours complet de la déclaration à la clôture, numérotation annuelle, B8, 409, mise en attente |
| `VisibiliteFichesTest` (7) | Visibilité PRD §2.4 par rôle, 404 sur toutes les ressources d'une fiche invisible |
| `DroitsFichesTest` (9) | Matrice des droits PRD §2.3 |
| `ReglesMetierTest` (25) | B1 à B8, T2 à T13, domaines → valideurs, signatures, actions, contrôles, gains, porte 2, concurrence, historique immuable même en SQL direct |
| `NotificationTest` | Compteur, lecture, isolation par utilisateur |
| `CalculsTest` (5) | Formules et « Non calculable » |

Outil commun : trait `tests/Concerns/SimuleFiches` (acteurs par rôle, amener une fiche à une étape donnée).

Contrôle par mutation : désactiver B8 ou B1 dans le code fait échouer les tests correspondants.

Frontend : `npm run lint` sans erreur, `npm run build` réussi. Aucune vérification visuelle dans un navigateur pour les étapes 3 bis et 3 ter (pas de navigateur disponible) ; l'API a été vérifiée par le proxy Vite avec cookies Sanctum.

## 8. Décisions d'implémentation

- **PostgreSQL seul**, pour l'application et les tests ; SQLite retiré de la configuration (un fichier `database/database.sqlite` non suivi subsiste).
- **Backend source de vérité** : le masquage d'un bouton n'est qu'un confort, chaque opération est vérifiée côté serveur.
- **Pas de version d'API** : un seul frontend livré avec le backend, toutes les routes sous `/api` (le `/api/v1` du TRD §7.1 est abandonné).
- **Profil actif en session serveur** ; la première affectation active est proposée par défaut.
- **Une fiche invisible est introuvable (404)**, jamais interdite (403), pour ne pas révéler son existence.
- **Règles métier dans les services**, pas dans les contrôleurs ; `FicheWorkflow` est le seul à changer l'étape.
- **Enregistrement explicite des sections**, chaque enregistrement étant tracé dans l'historique.
- **Hypothèse D2** : une action corrective est vérifiée une seule fois, à 30 jours.
- **Comptes et fiches de démonstration** réservés aux environnements `local` (et `testing` pour les comptes).
- **Inscription publique interdite** : comptes créés par l'administrateur fonctionnel.
- **Politique de mot de passe** : 8 caractères minimum, au moins une majuscule et un chiffre (contrôlé par le serveur, rappelé dans le formulaire de réinitialisation).
- **Notifications métier** séparées des notifications Laravel.
- **Thème centralisé** dans les variables CSS ; aucune ressource externe (polices système).

## 9. Écarts avec les documents de référence

| Sujet | Référence | Choix actuel |
|---|---|---|
| Préfixe d'API | TRD §7.1 : `/api/v1` | `/api` (décision du binôme) |
| Autorisations | TRD §5.2 : Policies, Form Requests, Resources | Règles dans les services, validation dans les contrôleurs, une seule Resource |
| Client API | UX §11 : `services/` + hooks, TanStack Query, React Hook Form, Zod | `services/` partiel ; certains composants appellent l'API directement ; dépendances non installées |
| Police | UX §2.5 : Inter via `@fontsource/inter` | Polices système (dépendance à valider) |
| Maquette | Courbes d'évolution « +12 % ce mois » | Non reprises : aucun historique d'indicateurs |
| Messages d'erreur | UX §10.1 : français partout | Validation Laravel encore en anglais (`APP_LOCALE=en`) |

## 10. Reste à faire

Par ordre du plan d'implémentation :

1. **Pièces jointes** (L10) : dépôt (type réel, 10 Mo, 20 fichiers), téléchargement authentifié ; l'onglet est affiché vide.
2. **Relances** : bouton « Relancer » (une par 24 h et par cible, 429) et commande `a3:relances` planifiée (7 jours).
3. **Mot de passe et SMTP** (L12) : bouton d'envoi de courriel d'essai.
4. **Export PDF A3** (L13) : `PdfExporter`, Dompdf ; le bouton est affiché mais inactif.
5. **Indicateurs complets de la Direction** (L9) : répartitions par unité, type et origine.
6. **Points d'extension** : `AuthProvider` / `LdapAuthProvider`, `SapGateway` / `NullSapGateway` / `FakeSapGateway`.
7. **Finitions** : messages Laravel en français, avertissement de session 2 minutes avant l'expiration, README d'installation, document des points d'extension.

## 11. Points de vigilance

- **Secret exposé** : l'ancien mot de passe PostgreSQL figure dans le commit `2219fc9`. Le changer, surtout si le dépôt a été poussé.
- **`migrate:fresh` efface toute la base locale**, y compris les fiches saisies à la main, puis recrée les données de démonstration.
- **Rien n'est commité** depuis le commit `2219fc9` : une grande partie du travail n'est suivie par aucun commit.
- **Avant la livraison** : retirer ou désactiver les comptes à mot de passe partagé et `DemoFichesSeeder` hors démonstration.
