## TRD — Technical Requirements Document

Projet P13 — Outil de suivi des fiches A3 (SAR) · Version 2.0 · 13 octobre 2026 · Statut : spécifications techniques de référence

## 1. Objet et périmètre

Ce document fixe les exigences techniques de P13 : architecture, technologies, base de données, API, authentification, sécurité, déploiement préparé pour la SAR. Les règles métier et les fonctions sont dans le PRD v2 et ne sont pas redéfinies ici ; en cas de conflit, le PRD prime. Le plan d'implémentation donne l'ordre de réalisation.

Chaque information porte un état : Confirmé (choix communiqué), Recommandé (solution proposée), À confirmer (non décidé).

## 2. Environnement technologique

| Composant Frontend | Technologie État React 19.2.5, Vite, JavaScript (JSX) Confirmé |   |
| --- | --- | --- |
| Interface Backend Base de données Accès aux données Authentification Communication Dépôt Tests backend Tests frontend Export PDF | Material UI, template Elegent entièrement Confirmé adapté (mise en page, palette SAR) Laravel Framework 13.35.0 Confirmé PostgreSQL Confirmé (imposé) Eloquent ORM et migrations Retenu Laravel Sanctum, mode SPA (cookies de Retenu session), fournisseur local API REST JSON, préfixe /api/v1 Retenu Git unique, deux applications séparées Confirmé ( frontend/ , backend/ ) Pest (ou PHPUnit) Recommandé Vitest et React Testing Library Recommandé génération côté serveur (Dompdf), papier Recommandé, à A3 paysage confirmer |   |


| Composant | Technologie | État |
| --- | --- | --- |
| Fichiers | disque privé du serveur (hors dossier | Recommandé |
|   | public) |   |
| Courriel | Laravel Mail, SMTP configurable ; transport | Recommandé |
|   | log pour la démonstration |   |
| Tâches planifiées | planificateur Laravel ( schedule:run | Recommandé |
|   | chaque minute par cron) |   |
| Temps réel | aucun ; interrogation périodique toutes les | Confirmé |
|   | 60 secondes |   |
| Exécution | poste du binôme pour la démonstration ; | Confirmé |
|   | installation classique documentée pour la |   |
|   | SAR |   |

Les versions de PHP, Node.js, Composer et PostgreSQL doivent être compatibles avec Laravel 13.35.0 et React 19.2.5 ; elles sont relevées et documentées dès la phase 1 (À confirmer).

## 3. Architecture technique

## 3.1 Architecture générale

Architecture client-serveur en trois couches :

- Présentation : React. Affiche, navigue, saisit ; n'applique aucune règle de sécurité.

- Applicative : Laravel. Authentification, autorisation, validation, règles métier, workflow, notifications, relances, export PDF.

- Persistance : PostgreSQL pour les données ; disque privé pour les fichiers.

## 3.2 Principes

- Séparation présentation, logique métier et persistance.

- Communication frontend et backend uniquement par l'API.

- Règles métier centralisées dans le backend.

- Autorisations contrôlées côté serveur pour chaque opération sensible.

- Cohérence : chaque opération multi-données s'exécute dans une transaction.

- Journaux techniques séparés de l'historique métier.

- Frontend indépendant de la structure interne de la base.


- Deux points d'extension seulement, derrière des interfaces : AuthProvider et SapGateway (section 17).

## 3.3 Organisation du dépôt (recommandée)

- backend/ : application Laravel ( app/Services , app/Policies , app/Enums , app/Contracts , app/Http/Requests , app/Http/Resources , app/Console/Commands ).

- frontend/ : application Vite et React ( src/api , src/components , src/pages , src/theme , src/hooks ).

- docs/ : PRD, TRD, plan d'implémentation, diagrammes.

## 4. Frontend

- Base : le projet Vite et le template Elegent déjà initialisés. Garder la mise en page (barre latérale, en-tête, tableaux, formulaires) ; supprimer les pages et fonctions du template qui ne servent pas (dont le multilingue : l'interface est en français seulement).

- Thème : transposer colors.css dans le thème Material UI (palette primaire --brand- 500 , fond --bg-page ) et exposer les variables CSS pour les puces de statut ( --st-* , --action-* , --conf-* ), les messages et les graphiques. Le logo SAR figure dans la barre latérale et sur la page de connexion.

- Routage : React Router, routes protégées selon le profil actif (section 11.3 du PRD).

- Données : appels API centralisés dans src/api ; cache et rafraîchissement avec TanStack Query (recommandé), dont l'interrogation des notifications au chargement puis toutes les 60 secondes.

- Formulaires : React Hook Form et Zod (recommandés) ; les erreurs 422 du serveur sont affichées près des champs.

- États de sauvegarde : non enregistré, en cours, réussi, échec ; la confirmation n'apparaît qu'après la réponse positive du backend.

- Session : une réponse 401 renvoie vers la connexion ; avertissement 2 minutes avant l'expiration des 30 minutes d'inactivité.

- Fichiers : le téléchargement (pièces jointes, PDF) passe par une requête authentifiée qui récupère un blob ; aucune URL publique.

- Poste de bureau seulement : largeur minimale 1280 px ; pas de gabarit mobile.

- Autorisations dans l'interface : le masquage d'un menu ou d'un bouton n'est pas une sécurité ; toute opération est contrôlée par le backend.

- Aucun secret dans le code ni dans les variables Vite ( VITE_* est public).


## 5. Backend

## 5.1 Technologie

Laravel Framework 13.35.0, PHP compatible. API uniquement (pas de pages Blade).

## 5.2 Organisation recommandée

| Couche | Rôle |
| --- | --- |
| Routes routes/api.php | points d'entrée versionnés /api/v1 |
| Contrôleurs | minces : valident, appellent un service, renvoient |
|   | une ressource |
| Form Requests | validation des entrées |
| Policies | autorisation par modèle et par opération |
| Services | règles métier (ci-dessous) |
| API Resources | format uniforme des réponses |
| Enums PHP | statuts, types, rôles |
| Observers | journal des modifications de champ |
| Commandes | a3:relances |

Services métier : FicheWorkflow (seul code autorisé à modifier le statut d'une fiche),

ValidationCircuit , ControleEfficaciteService , HistoryLogger , RelanceService , NotificationService , FicheVisibility (scope de visibilité unique), Calculs

(formules du PRD 6.2), PdfExporter , PieceJointeService .

## 5.3 Interfaces d'extension

Les interfaces AuthProvider et SapGateway sont dans app/Contracts . Leur implémentation active est choisie par config/a3.php ( auth_provider : local , sap_enabled : faux) et liée dans un service provider. Détail en section 17.

## 6. Base de données PostgreSQL

## 6.1 Modèle

Le modèle relationnel est défini : PRD v2 section 12 (tables et colonnes) et diagramme de classes v2. Le TRD n'y ajoute que les conventions techniques ci-dessous.


## 6.2 Conventions et contraintes

- Noms de tables et colonnes en français sans accents, snake_case ; clés primaires bigint ; clés étrangères déclarées avec règle de suppression explicite (pas de suppression en cascade sur les données tracées).

- Statuts et types : valeurs textuelles contrôlées par un enum PHP et une contrainte CHECK .

- Montants en FCFA : entiers bigint , sans décimales. Dates : date ou timestamptz ; fuseau d'affichage Africa/Dakar, stockage en UTC.

- Unicité : users.identifiant , users.email , fiches_a3.numero_a3 . Numérotation A3-AAAA-NNN par une table de compteurs annuels verrouillée à la création.

- Index sur les colonnes de recherche, de filtre, d'échéance et de jointure : statut , unite_id , pilote_id , date_cible , echeance , date_echeance des contrôles, lu_le des notifications.

- Aucune suppression physique des données soumises à traçabilité ; désactivation par actif .

- Journal immuable : un déclencheur PostgreSQL refuse UPDATE et DELETE sur evenements_historique , en plus du modèle sans écriture après création (recommandé).

- Migrations versionnées et reproductibles ; deux jeux de seeders : données de base et DemoSeeder (jamais en production).

## 7. API REST

## 7.1 Principes

Préfixe /api/v1 , JSON, méthodes HTTP cohérentes, validation serveur, réponses uniformes : succès { data, meta? } , erreurs { message, code, errors? } . Les erreurs ne divulguent ni secret ni détail technique.

## 7.2 Listes

Pagination côté serveur ( page , per_page , 100 au maximum) ; filtres et champs de tri limités à une liste blanche ; la visibilité (PRD 2.4) est appliquée avant toute réponse.

## 7.3 Codes HTTP

| Code | Usage |
| --- | --- |
| 200, 201, 204 succès, création, succès sans contenu |   |


| Code | Usage |
| --- | --- |
| 401 | non authentifié ou session expirée |
| 403 | accès interdit |
| 404 | ressource introuvable, ou non visible (politique des |
|   | fiches restreintes) |
| 409 | conflit d'état ou de transition (fiche déjà passée à |
|   | un autre statut) |
| 422 | données invalides ou garde métier non satisfaite |
|   | (liste des conditions manquantes) |
| 429 | limitation de fréquence (connexion, relance, |
|   | réinitialisation) |
| 500 | erreur serveur inattendue |

## 7.4 Ressources principales

| Ressource | Points d'entrée (indicatifs) |
| --- | --- |
| Authentification | POST /auth/connexion , POST |
|   | /auth/deconnexion , GET /auth/moi , POST |
|   | /auth/profil-actif , POST /auth/mot-de-passe- |
|   | oublie , POST /auth/reinitialisation , POST |
|   | /auth/mot-de-passe |
| Administration fonctionnelle | GET /api/admin/users , POST/PATCH |
|   | /api/admin/users/{id} , POST |
|   | /api/admin/users/{id}/password-link |
|   | GET /api/admin/roles (lecture seule) |
|   | GET/POST/PATCH /api/admin/assignments |
|   | GET/POST/PATCH /api/admin/units |
|   | GET/POST/PATCH /api/admin/equipment |
|   | GET /api/admin/lists , GET/POST/PATCH |
|   | /api/admin/lists/{id}/values , PUT |
|   | /api/admin/lists/{id}/values/order |
|   | GET/PUT /api/admin/settings |
|   | GET/PATCH /api/admin/fiches (résumé, pilote, |
|   | confidentialité uniquement) |
| Fiches | GET/POST /fiches , GET/PATCH /fiches/{id} , |
|   | POST /fiches/{id}/pilote , POST |
|   | /fiches/{id}/transitions (corps : code T3, T7, |
|   | etc., plus motif ou commentaire) |
| Contenu de la fiche | /fiches/{id}/impacts , /indicateurs , |
|   | /mesures , /causes , /actions , /risques , |
|   | /gains , /perennisation , /lecons |
| Contrôles | GET /fiches/{id}/controles , PATCH |
|   | /controles/{id} (enregistrement du résultat) |
| Validations | GET /validations (à traiter), POST |
|   | /validations/{id}/decision |


| Ressource | Points d'entrée (indicatifs) |
| --- | --- |
| Transversal | /fiches/{id}/commentaires , |
|   | /fiches/{id}/pieces-jointes , GET /pieces- |
|   | jointes/{id}/telechargement , |
|   | /fiches/{id}/historique , POST /relances |
| Notifications | GET /notifications , GET /notifications/non- |
|   | lues , POST /notifications/{id}/lu |
| Tableaux de bord | GET /tableau-de-bord (selon le profil actif), GET |
|   | /kpi |
| Export | GET /fiches/{id}/export.pdf |

## 7.5 Contrat d'un endpoint

Chaque endpoint précise : méthode et chemin, paramètres, règles de validation, permissions requises, effet sur le workflow, notifications ou événements déclenchés, format de réponse, erreurs possibles. Les contrats sont documentés dans le code (Form Requests et Resources) et couverts par des tests.

## 8. Authentification et autorisations

## 8.1 Sanctum en mode SPA

Le frontend et l'API sont servis sous le même domaine (le frontend compilé sous / , l'API sous /api ), ce qui permet l'authentification par session et cookies avec protection CSRF ( /sanctum/csrf-cookie ). Configuration à prendre en compte : domaines et origines autorisés, cookies HttpOnly , SameSite=Lax et Secure hors développement, invalidation de session à la déconnexion, hachage des mots de passe par le mécanisme de Laravel. La configuration définitive dépend du domaine du serveur de la SAR (À confirmer).

## 8.2 Session et protection

- Durée de vie de session 30 minutes d'inactivité ( SESSION_LIFETIME=30 , renouvelée à chaque requête).

- Limitation des tentatives : 5 échecs en 15 minutes, par identifiant et par adresse.

- Message d'échec identique pour un identifiant inconnu et un mot de passe faux.


## 8.3 Fournisseur d'authentification

Toute connexion passe par AuthProvider (section 17). Le fournisseur local vérifie le mot de passe haché ; un compte ldap ne porte aucun mot de passe.

## 8.4 Modèle d'autorisation

L'autorisation dépend du rôle de l'affectation active, de l'unité, de l'état de la fiche, de sa confidentialité, de l'opération demandée et de l'identité (B8). Le profil actif est mémorisé côté serveur dans la session. Les permissions sont définies par la matrice du PRD 2.3 et la visibilité du PRD 2.4, implémentées par des Policies et par le scope FicheVisibility .

## Restrictions obligatoires :

- le pilote ne peut pas approuver sa propre fiche ;

- l'administrateur fonctionnel ne modifie aucune donnée métier, sauf la désignation du pilote et le niveau de confidentialité, et n'approuve rien à la place d'un autre ;

- l'administrateur technique n'a aucun accès au contenu des fiches ;

- les fiches restreintes ne sont accessibles qu'aux profils autorisés ;

- exports, historique, tableaux de bord, notifications et téléchargements respectent la même confidentialité que les données sources.

## 9. Courriel de réinitialisation du mot de passe

C'est le seul courriel de l'application. Il utilise Laravel Mail ; les paramètres SMTP (hôte, port, chiffrement, utilisateur, mot de passe, adresse d'expédition) sont saisis par l'administrateur technique, stockés dans parametres (mot de passe chiffré) et appliqués à l'exécution, avec un bouton d'envoi de test. Jeton à usage unique, haché en base, valable 60 minutes ; au plus 3 demandes par heure et par adresse ; réponse identique que le compte existe ou non ; refus pour les comptes ldap . En démonstration ou sans SMTP, le transport log écrit le lien dans le journal technique.

## 10. Workflow technique

- Une machine à états : enum des statuts, table des transitions autorisées (PRD 5) et gardes (B1 à B8) implémentées dans FicheWorkflow . Aucun contrôleur ni modèle ne modifie statut directement.

- Chaque transition : transaction, verrou de ligne ( lockForUpdate ) sur la fiche, vérification du statut courant (409 si périmé), gardes (422 avec la liste des manques), effets (validations, contrôles, notifications, journal).


- ValidationCircuit crée et résout les demandes des portes 1 et 2 (PRD 7), conserve l'empreinte de domaine des signatures.

- ControleEfficaciteService crée les trois contrôles à la réalisation d'une action et applique B4 (PRD 8.3).

## 11. Relances, notifications et tâches planifiées

- Commande a3:relances exécutée une fois par jour ; idempotente : une contrainte unique sur (cible, jour) et la vérification des 24 heures empêchent les doublons.

- Cadence et option des validations lues dans parametres (7 jours, validations incluses).

- Table notifications ; la route GET /notifications/non-lues renvoie le compteur, appelée au chargement puis toutes les 60 secondes. Aucun WebSocket.

- Les notifications cessent quand l'élément est résolu ou que le destinataire perd son droit d'accès.

## 12. Fichiers et export PDF

- Stockage : disque privé ( storage/app/private ), nom aléatoire (UUID), métadonnées en base, aucun lien symbolique public.

- Contrôles à l'envoi : type réel détecté par le contenu (pas seulement l'extension), liste blanche PDF, PNG, JPEG, DOCX, XLSX, PPTX, 10 Mo par fichier et 20 fichiers par fiche (paramétrables). Pas d'analyse antivirus (extension prévue pour la SAR).

- Téléchargement : par un contrôleur qui applique la Policy de la fiche, jamais par URL publique.

- PDF A3 : généré côté serveur par PdfExporter , papier A3 paysage, 12 sections, version, contrôles, signatures, confidentialité ; mêmes autorisations que la consultation. Pas d'export Excel. Le choix définitif de la bibliothèque dépend de sa compatibilité avec l'environnement (À confirmer).

## 13. Calculs

Toutes les formules (écart, amélioration, A, B, gain net, payback) vivent dans la classe Calculs , avec montants entiers en FCFA et arrondi défini ; « Non calculable » quand le dénominateur est nul. Les écrans, tableaux de bord et exports appellent la même classe pour rester cohérents.


## 14. Sécurité

- HTTPS dans tout environnement déployé ; cookies sécurisés ; en-têtes de sécurité usuels.

- Validation serveur de toutes les entrées ; requêtes paramétrées par Eloquent ; attributs assignables listés explicitement.

- Autorisation serveur pour chaque opération sensible ; protection contre les accès directs non autorisés (fiches, fichiers, exports).

- Secrets uniquement dans .env , jamais dans Git ; mots de passe et jetons jamais journalisés ni renvoyés.

- Journalisation des opérations sensibles ; journal d'administration technique séparé (affectations, listes, paramètres, comptes) ; historique métier distinct.

- Contrôle d'accès aux fiches restreintes, gains et exports.

- Ce document ne constitue pas une certification de sécurité : l'audit de la SAR reste nécessaire avant toute mise en production.

## 15. Environnements et déploiement (préparés pour la SAR)

L'équipe ne déploie pas ; elle prépare l'installation.

- Démonstration : PC du binôme, serveur de développement Vite, php artisan serve , PostgreSQL local, DemoSeeder .

- Installation classique documentée (README court) : prérequis (PHP, Composer, Node.js, PostgreSQL), composer install , .env , php artisan key:generate , php artisan migrate --seed , npm ci puis npm run build , ligne cron * * * * * php artisan schedule:run , droits sur storage/ .

- Variables d'environnement ( .env.example des deux applications) : base de données, APP_URL , SESSION_LIFETIME=30 , domaines Sanctum, AUTH_PROVIDER=local , SAP_ENABLED=false , transport de courriel.

- Docker n'est pas fourni (option laissée à la SAR) ; la production, le serveur web, les sauvegardes et leur restauration sont à définir avec la SAR.

- Séparation stricte des données de démonstration et des données réelles ; configuration par variables protégées.

## 16. Qualité et tests

- Backend : tests de fonctionnalité Pest pour chaque règle T et B, chaque exigence FR critique, la matrice des permissions et la visibilité ; tests unitaires de Calculs ; tests de contrat des interfaces avec des faux fournisseurs.


- Frontend : Vitest pour les composants critiques (états de sauvegarde, progression des 12 sections, avertissement de session) ; un parcours de bout en bout (Playwright) est facultatif.

- Outils de qualité recommandés : Laravel Pint, ESLint, Prettier.

- Les scénarios d'acceptation du PRD (section 16) servent de recette ; aucun défaut bloquant ne doit subsister à la livraison.

## 17. Points d'extension laissés à la SAR

| Point | Interface |   | Livré | À faire par la SAR |
| --- | --- | --- | --- | --- |
| Annuaire | AuthProvider | : | LocalAuthProvider | choisir la bibliothèque |
| LDAP | attempt(identifiant, |   | actif ; | LDAP, renseigner |
|   | motDePasse) , |   | LdapAuthProvider | serveur, port, |
|   | userFor(identifiant) |   | squelette désactivé | chiffrement, base de |
|   |   |   | et commenté | recherche, compte de |
|   |   |   |   | liaison, attribut |
|   |   |   |   | d'identifiant, filtre ; |
|   |   |   |   | activer |
|   |   |   |   | AUTH_PROVIDER=ldap ; |
|   |   |   |   | créer les comptes |
|   |   |   |   | ldap |
| API SAP | SapGateway : |   | NullSapGateway | écrire la classe qui |
|   | findEquipement , |   | actif ; | appelle l'API SAP ; |
|   | findAvis , findOrdre |   | FakeSapGateway | activer |
|   | (lecture seule, renvoient |   | pour les tests | SAP_ENABLED=true |
|   | libellé, statut, coût ou |   |   |   |
|   | rien) |   |   |   |
| Courriel de | Laravel Mail |   | transport log , SMTP | fournir le serveur |
| production |   |   | réglable par | SMTP |
|   |   |   | l'administrateur |   |
|   |   |   | technique |   |
| Déploiement | — |   | README | serveur, Docker |
| et |   |   | d'installation | éventuel, sauvegarde |
| sauvegardes |   |   | classique | et restauration |
| Antivirus des | PieceJointeService |   | contrôle de type et | ajouter l'analyse |
| fichiers |   |   | de taille | antivirus |


## 18. Éléments restant à confirmer

| Élément | État |
| --- | --- |
| Versions de PHP, Node.js, Composer et | À confirmer (phase 1) |
| PostgreSQL compatibles |   |
| Configuration définitive de Sanctum | À confirmer |
| (domaines du serveur SAR) |   |
| Bibliothèque PDF | À confirmer (Dompdf recommandé) |
| Règle de planification des contrôles après | À valider avec le métier (PRD D2) |
| une action corrective |   |
| Valeurs des listes « types d'action » et « | À valider avec l'amélioration continue |
| fréquences » |   |
| Formules de gains | À valider avec le Contrôle de gestion (la |
|   | devise FCFA est confirmée) |
| Infrastructure de production, sauvegardes | À définir avec la SAR |
| et restauration |   |

Ne sont plus ouverts : le modèle relationnel (PRD 12 et diagramme v2), la matrice des permissions (PRD 2.3), le format du numéro A3 ( A3-AAAA-NNN ), les formats et limites des pièces jointes (PRD D8), le stockage des fichiers (disque privé).

## 19. Limites du périmètre technique

Sont inclus : application React, backend Laravel, PostgreSQL, Sanctum, API REST, workflow, validations, actions, contrôles d'efficacité, mesures, gains, pièces jointes, commentaires, historique, notifications internes, relances, courriel de réinitialisation, export PDF A3.

Sont exclus : connexion LDAP réelle, appels SAP, SNCC et GMAO, notifications par courriel, WebSocket, export Excel, tablette et mobile, déploiement en production, analyse antivirus.
