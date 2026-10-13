# Plan d’implémentation P13 — Fiche A3 numérique SAR
*13 octobre 2026 · @ibzer*

Le parcours A3 complet (P1) est livré le vendredi 23 octobre, les compléments (P2) avant
le gel du code du mercredi 28, et la démonstration a lieu le vendredi 30 octobre 2026 : 14
jours ouvrés, à deux. Ce plan remplace la version 1.0 et s'appuie sur le PRD v2 (qui prime)
et le TRD v2.

## 1. Constats sur le PRD v2 et le TRD v2
Les deux documents tiennent ensemble et règlent les 13 écarts de la première analyse
(LDAP, base de données, relances, export, courriel, session). Dix points restent à traiter ;
les quatre premiers peuvent casser la démo ou la sécurité s'ils sont découverts tard.

   N°      Constat                       Risque                    Traitement dans ce plan

   C1      Session de 30 min             La session n'expire       L2 : la route des notifications ne
           d'inactivité (PRD D13,        jamais tant qu'un         renouvelle pas l'activité ;
           TRD 8.2) et interrogation     onglet reste ouvert.      l'expiration se calcule sur la
           des notifications toutes                                dernière requête utilisateur, et
           les 60 s (D11) : chaque                                 le front arrête l'interrogation
           interrogation renouvelle                                après inactivité.
           la session.

   C2      La clôture exige les trois    La partie la plus         L14 : le DemoSeeder prépare
           contrôles J+30/60/90 (T8,     importante du             une fiche par étape, dont une à
           PRD 8.5) : aucune fiche       workflow est invisible    « Vérification du maintien » avec
           créée pendant la démo         en démo.                  contrôles déjà disponibles, à
           ne peut être clôturée.                                  clôturer en direct.

   C3      Le PRD 12 liste               Un modèle                 L1 : saisie manuelle dans
            fiches_a3 sans n° d'avis     incohérent, difficile à   references_sap (numéro
           ni n° d'ordre SAP, alors      corriger après les        d'avis, d'ordre ; libellé, statut,
           que FR-22 (P1) les saisit à   migrations.               coût vides jusqu'au
           la main et que                                          branchement de SapGateway ).
            references_sap est                                     À valider le 13 octobre.
           décrite comme alimentée
           par la SAR.

Untitled

   N°      Constat                        Risque                   Traitement dans ce plan

   C4      PDF A3 paysage de 12           Découvrir l'obstacle     L0 : test de rendu d'une page A3
           sections avec Dompdf,          le 27 octobre.           paysage dès le jour 3 ; mise en
           dont le CSS est limité                                  page en tableaux ; repli : feuille
           (pas de flex ni de grille) ;                            de style d'impression.
           bibliothèque encore « à
           confirmer » (TRD 18).

   C5      empreinte_domaine des          Impossible de coder      L1 : empreinte = hachage des
           signatures est utilisée        la règle « signatures    risques et actions du domaine
           (PRD 7, TRD 10) mais           conservées sauf si le    concerné. Hypothèse à
           jamais définie.                domaine change ».        confirmer avec l'amélioration
                                                                   continue.

   C6      Le 409 de                      Deux transitions         L6 : le corps de POST
           FicheWorkflow (A14)            simultanées passent      /fiches/{id}/transitions
           suppose que le client          toutes les deux.         porte statut_etape_attendu .
           indique l'état qu'il croit
           courant ; l'API ne le
           prévoit pas.

   C7      La matrice (PRD 2.3)           Tests de permission      La matrice prime : un valideur
           interdit à un valideur de      contradictoires.         qui déclare reçoit aussi une
           déclarer ; la section 17                                affectation Agent.
           l'autorise (« valideur
           également déclarant »).

   C8      La visibilité Restreint        La réécrire après        L2 : FicheVisibility gère
           (FR-16) est P2, mais           coup, avec des fuites    Normal et Restreint dès le jour 3
            FicheVisibility filtre        possibles.               ; seuls les écrans de
           toutes les listes, API,                                 changement de niveau restent
           exports et notifications.                               en P2 (L10).

   C9      Les tests Pest portent sur     Des tests qui passent    L0 : base de test PostgreSQL
           un déclencheur                 sur SQLite et            dédiée.
           PostgreSQL et des              échouent en base
           contraintes CHECK.             réelle.

   C10     Sanctum en mode SPA            Cookies et CSRF          L0 : proxy Vite de /api et
           exige un même domaine ;        refusés, jours perdus.   /sanctum vers Laravel.
           en développement, Vite
           (5173) et Laravel (8000)
           sont deux origines.

Untitled

Le PRD v2 est aussi cohérent sur ce qui a été tranché : connexion locale, courriel limité au
mot de passe, relance manuelle conservée, rappel tous les 7 jours, PDF A3 seul, PC seul,
FCFA entiers.

## 2. Principes et organisation
On prévoit tout dans le modèle et l'API dès le début, mais on construit par tranches
verticales : chaque tranche va de la base à l'écran et se démontre seule.

     Modèle complet au jour 2. Les 30 tables du PRD 12, les enums, les contraintes, le
     déclencheur d'historique et les interfaces AuthProvider et SapGateway existent
     avant la première fonctionnalité. Seul Dev A écrit les migrations jusqu'au jour 2.
     Ordre des tranches. Connexion et rôles, déclaration, fiche en 12 sections, workflow et
     validations, actions et contrôles, gains et clôture, puis notifications et tableaux de
     bord.
     Règles jamais coupées. Workflow T1–T13, blocages B1–B8, droits vérifiés côté serveur,
     historique immuable, classe Calculs .
     Tests au fil de l'eau. Chaque transition, chaque règle B, la matrice des permissions et
       Calculs ont leur test Pest le jour où le code est écrit, sur PostgreSQL. Vitest se limite
     aux composants critiques (TRD 16).
     Fin de journée. Fusion dans main chaque soir, branches courtes, revue croisée ; à 17 h,
       migrate:fresh --seed et le parcours en cours doivent passer.
     Documenté en continu. Le README d'installation et le document des points
     d'extension LDAP et SAP s'écrivent avec le code, pas le dernier jour.

   Rôle      Responsabilité principale

   Dev A     Socle, base de données, authentification et droits,
             workflow, circuit de validation, contrôles,
             notifications, relances, tests backend

   Dev B     Thème et template, écrans, formulaire en 12
             sections, actions, mesures, gains, tableaux de bord,
             PDF A3, tests frontend

Cette répartition est une proposition ; chaque lot est livré de bout en bout (API puis
écran) par celui qui le porte, l'autre relisant.

Untitled

## 3. Calendrier du 13 au 30 octobre
Trois jalons : P1 le vendredi 23 (parcours A3 complet, démo interne), gel du code le
mercredi 28 à 17 h, démonstration le vendredi 30. Les jours 12 à 14 ne servent qu'à corriger.

   Jour    Date   Dev A                              Dev B                     Jalon

   1       mar.   L0 : versions PHP, Node,           L0 : thème Material       Les deux
           13     Composer, PostgreSQL ;             UI depuis                 applications
           oct.   arborescence ; Sanctum et           colors.css , logo,       démarrent
                  proxy ; base de test ; début des   nettoyage du
                  migrations (utilisateurs, rôles,   template
                  unités, affectations, listes)      (multilingue), client
                                                      src/api , TanStack
                                                     Query, formulaires

   2       mer.   L1 : toutes les migrations,        L2 : page de              migrate:fresh
           14     enums, CHECK, déclencheur          connexion, contexte       --seed passe
           oct.   d'historique, compteurs,           d'authentification,
                  seeders de base                    gestion des 401 et
                                                     422, composant
                                                     d'état de sauvegarde

   3       jeu.   L2 : AuthProvider ,                L2 : coque (barre         Connexion et
           15     LocalAuthProvider , limitation     latérale par profil,      profils
           oct.   des tentatives, session 30 min     en-tête, sélecteur de
                  (C1), profil actif, Policies,      profil) ; test de rendu
                  FicheVisibility                    PDF A3 (C4)

   4       ven.   L3 : API d'administration          L3 : écrans               Référentiels
           16     (comptes, affectations, unités,    d'administration          administrables
           oct.   équipements, listes,
                  paramètres), journal
                  d'administration

   5       lun.   L4 : API fiches, numérotation      L4 : registre             Déclaration
           19     A3-AAAA-NNN, désignation du        (recherche, filtres,      jusqu'au pilote
           oct.   pilote, FicheWorkflow T1–T2,       tri, pagination),
                  historique                         écran de déclaration,
                                                     choix du pilote

   6       mar.   L5 : sections 2 à 7 côté API,      L5 : formulaire par       Brouillon
           20     brouillons, Calculs avec tests     étapes, sections 1 à      complet
           oct.   unitaires                          7, états de
                                                     sauvegarde

Untitled

   Jour    Date   Dev A                               Dev B                     Jalon

   7       mer.   L6 : T3–T5, T12–T13,                L5 : sections 8 à 12 ;    Porte 1 de bout
           21     ValidationCircuit , B2, B6–B8,      écran des validations     en bout
           oct.   409 et 422                          à traiter, boutons de
                                                      transition et liste des
                                                      manques

   8       jeu.   L7 : actions, MOC (B1),             L7 : écrans d'actions,    Cycle jusqu'à la
           22     ControleEfficaciteService ,         mesures, gains,           clôture
           oct.   gains, T6–T11                       contrôles, historique

   9       ven.   L8 : notifications, relance         L8 et L9 : cloche,        P1 : démo
           23     manuelle (429), références SAP,     tableaux de bord de       interne
           oct.   SapGateway nul et factice           base par profil ; test
                                                      du parcours complet

   10      lun.   L10 : changement de                 L10 : écrans de           Restreint, pièces
           26     confidentialité, pièces jointes     confidentialité,          jointes
           oct.   (type réel, 10 Mo, 20 fichiers,     pièces jointes et
                  téléchargement autorisé)            commentaires

   11      mar.   L11 : commande a3:relances (7       L13 : PdfExporter ,       Rappels, mot de
           27     jours, sans doublon), L12 : jeton   modèle A3 paysage         passe
           oct.   de réinitialisation, SMTP,
                  transport log

   12      mer.   L9 : indicateurs complets de la     L12 : écrans de mot       Gel du code à 17
           28     Direction ; L14 : recette A1–A23    de passe oublié,          h
           oct.   côté API                            d'état technique et
                                                      SMTP ; L14 : recette
                                                      côté écrans

   13      jeu.   Correctifs bloquants et majeurs     Finitions P3 si le        Répétition de la
           29     ; DemoSeeder final                  temps le permet ;         démo
           oct.                                       README et
                                                      document des points
                                                      d'extension

   14      ven.   Démonstration ; remise du code,     Démonstration             Démo (à
           30     de la base de démo et des                                     confirmer)
           oct.   documents

Untitled

## 4. Lots de réalisation
Quinze lots remplacent les douze phases de la version 1.0. Chaque lot a un critère de
validation vérifiable ; P1, P2 et P3 sont les priorités du PRD 15.

   Lot                Contenu                        Exigences   Priorité   Critère de
                                                                            validation

   L0 — Socle         Versions de PHP, Node,         TRD 2, 3,   P1         Les deux
                      Composer et PostgreSQL         4, 15, 16              applications
                      compatibles avec Laravel                              démarrent ; un
                      13.35.0 et React 19.2.5,                              test Pest et un
                      relevées dans le                                      test Vitest
                      README ; dépôt                                        passent ; une
                       frontend/ , backend/ ,                               page A3
                       docs/ ; .env.example ;                               paysage est
                      Pest, Vitest, Pint, ESLint ;                          produite
                      base de test PostgreSQL
                      ; proxy Vite ; thème
                       colors.css et logo ;
                      suppression du
                      multilingue ; test de
                      rendu PDF A3

   L1 — Modèle et     30 tables du PRD 12 ;          TRD 6       P1         migrate:fresh
   seeders            enums PHP et CHECK ;                                  --seed passe ;
                      clés étrangères sans                                  une requête
                      suppression en cascade ;                              directe
                      index ; déclencheur                                   modifiant
                      refusant UPDATE et                                    l'historique est
                      DELETE sur                                            refusée (A17)
                      evenements_historique
                      ; compteurs_fiches ;
                      référentiels initiaux de la
                      fiche papier ; types
                      d'action provisoires
                      (corrective, préventive,
                      amélioration)

Untitled

   Lot                Contenu                        Exigences    Priorité   Critère de
                                                                             validation

   L2 —               AuthProvider ,                 FR-15, FR-   P1         A3 (tentatives,
   Authentification   LocalAuthProvider ,            16                      session), A7 ;
   et droits          squelette                      (logique)               tests de la
                      LdapAuthProvider                                       matrice et de la
                      commenté ; Sanctum SPA                                 visibilité ; la
                      ; 5 échecs en 15 min ;                                 session expire
                      session de 30 min (C1) et                              même avec un
                      avertissement à 2 min ;                                onglet ouvert
                      profil actif ( POST
                      /auth/profil-actif ) ;
                      Policies selon la matrice
                      2.3 ; FicheVisibility
                      avec Restreint ; 404 pour
                      une fiche non visible

   L3 —               Comptes, rôles,                FR-15        P1         A2 (comptes et
   Administration     affectations (par unité ou                             affectations)
                      globales), unités,
                      équipements, listes
                      déroulantes, paramètres ;
                      journal d'administration
                      séparé de l'historique

   L4 —               Déclaration en une étape       FR-01, FR-   P1         A1 (dont la
   Déclaration et     (titre, origine, énoncé,       02, FR-14               remise à 001
   registre           unité), numéro A3-AAAA-                                l'année
                      NNN sous verrou,                                       suivante)
                      désignation du pilote, T1
                      et T2, registre avec
                      recherche, filtres, tri,
                      pagination (100 max)

   L5 — Fiche en 12   Sections 1 à 12 ; brouillons   FR-03, FR-   P1         A4, A9 ; tests
   sections           ; mesures Avant et Après       07, FR-22               unitaires de
                      ; Calculs (écart,                                      Calculs
                      amélioration, A, B, gain
                      net, payback, « Non
                      calculable ») ; références
                      SAP saisies à la main (C3)
                      ; états de sauvegarde
                      exacts

Untitled

   Lot                Contenu                       Exigences    Priorité      Critère de
                                                                               validation

   L6 — Workflow      FicheWorkflow (T1–T13),       FR-04,       P1            A5, A6, A7, A12,
   et validation      transaction et verrou de      FR-05, FR-                 A13, A14
                      ligne,                        10, FR-13
                      statut_etape_attendu
                      (C6) ; garde B2 avec liste
                      des manques ;
                      ValidationCircuit
                      (porte 1 : Production /
                      Exploitation puis les
                      domaines en parallèle ;
                      porte 2) ; empreinte de
                      domaine (C5) ; B6 à B8 ;
                      historique des
                      événements

   L7 — Actions,      Actions et statuts (dont      FR-06, FR-   P1            A8, A10, A11
   contrôles et       Bloquée) ; MOC et B1 ;        08, FR-09
   gains              trois contrôles par action
                      réalisée et action
                      corrective (B4) ; gains en
                      FCFA entiers (quantité ×
                      coût unitaire) ; validation
                      par le Contrôle de
                      gestion (B5) ; T6 à T11

   L8 —               Notifications internes ;      FR-11, FR-   P1            A16, A15 (partie
   Notifications et   cloche ; GET                  12                         manuelle)
   relance            /notifications/non-
   manuelle           lues au chargement puis
                      toutes les 60 s ; relance
                      manuelle (pilote,
                      Direction, admin
                      fonctionnel), 429 après la
                      première en 24 h ;
                       SapGateway nul et
                      factice

   L9 — Tableaux      Un tableau de bord par        FR-14, FR-   P1 (base),    A22
   de bord            profil ; sept indicateurs     21           P2
                      côté serveur ; indicateurs                 (Direction)
                      complets de la Direction
                      (répartition par unité,
                      type, origine)

Untitled

   Lot                 Contenu                      Exigences    Priorité   Critère de
                                                                            validation

   L10 — Restreint,    Changement de                FR-16, FR-   P2         A18, A19, A20
   pièces jointes,     confidentialité (pilote,     17
   commentaires        admin fonctionnel) ;
                       pièces jointes sur disque
                       privé, nom UUID, type
                       réel vérifié,
                       téléchargement par
                       requête autorisée ;
                       commentaires généraux ;
                       motifs de refus et de
                       blocage dès L6

   L11 — Rappels       a3:relances                  FR-18        P2         A15
   automatiques        quotidienne et
                       idempotente, rappel tous
                       les 7 jours (paramètre),
                       actions en retard et
                       validations en attente,
                       arrêt quand l'élément est
                       résolu

   L12 — Mot de        Jeton à usage unique, 60     FR-19        P2         A3
   passe et courriel   min, 3 demandes par
                       heure et par adresse ;
                       paramètres SMTP et
                       bouton d'essai ; transport
                       log ; refus pour les
                       comptes ldap

   L13 — PDF A3        PdfExporter : 12             FR-20        P2         A21
                       sections, version,
                       contrôles, signatures,
                       confidentialité, mêmes
                       droits que la consultation

   L14 — Recette et    Scénarios A1 à A23 ;         FR-23,       P2, P3     Aucun défaut
   passation           DemoSeeder final ;           A23                     bloquant ni
                       README ; document des                                majeur
                       points d'extension ;
                       manuel court et finitions
                       (P3)

Untitled

## 5. Ordre de renoncement en cas de retard
La décision se prend au jalon du vendredi 23 (fin de P1) puis le mardi 27. On coupe dans
cet ordre, de haut en bas ; chaque coupe laisse une version démontrable.

 1. FR-23 : manuel court et filtres avancés (P3).
 2. FR-21 : on garde les sept indicateurs de base, sans répartitions de la Direction.
 3. FR-17, commentaires généraux : on garde les commentaires obligatoires de refus et de
     blocage.
 4. FR-18 : on garde la relance manuelle, sans rappel automatique.
 5. FR-17, pièces jointes : le modèle et l'interface PieceJointeService restent prévus,
     sans écran.
 6. FR-19 : les comptes de démonstration viennent du seeder ; la réinitialisation par
     courriel est documentée pour la SAR.
 7. FR-20 : si Dompdf ne tient pas la mise en page A3, repli sur une page imprimable
     (feuille de style d'impression).

On ne coupe jamais : T1–T13, B1–B8, les droits côté serveur, l'historique immuable,
 Calculs , la visibilité Restreint côté serveur (C8).

## 6. Couverture des exigences
Les 23 exigences FR-01 à FR-23 et les 23 scénarios A1 à A23 du PRD figurent dans la
colonne Exigences et Critère de validation de la section 4 ; A23 (tests Pest sur chaque
règle T et B, la matrice, la visibilité et Calculs ) est transverse et se vérifie le mercredi 28.

## 7. Tests, démonstration et passation
La démo montre un parcours A3 complet sur des données fictives ; la passation donne à la
SAR de quoi brancher LDAP et SAP sans toucher au cœur de l'application.

Tests (TRD 16). Pest, sur PostgreSQL : succès et refus de chaque transition T et règle B ;
matrice des permissions pour les sept profils ; visibilité Normal et Restreint (404) ;
 Calculs (référence nulle, sens hausse ou baisse) ; numérotation sous verrou ; historique
refusé par la base ; limitation des tentatives ; contrats de AuthProvider et SapGateway
avec de faux fournisseurs. Vitest : états de sauvegarde, progression des 12 sections,
avertissement de session.

Base de démonstration ( DemoSeeder ).

     3 unités, un compte par profil et un compte cumulant deux rôles, identifiés comme
     comptes de démo.

Untitled

     Une fiche à chaque étape : Ouvert, En cours, En validation du plan, Réalisation des
     actions, Mesure des résultats, Vérification du maintien (contrôles déjà disponibles,
     C2), En validation de clôture, En attente, Clôturé.
     Une fiche Restreint, une action bloquée par une MOC, une action en retard et sa
     relance.

Parcours de démo (une quinzaine de minutes).

 1. Connexion et changement de profil.
 2. Un agent déclare une fiche ; l'administrateur fonctionnel désigne le pilote.
 3. Le pilote soumet un plan incomplet (liste des manques), puis complet.
 4. Production / Exploitation, puis un valideur de domaine, approuvent ; un refus avec
     commentaire.
 5. Une action sous MOC reste bloquée ; les contrôles J+30/60/90 de la fiche préparée
     sont enregistrés.
 6. Les gains en FCFA sont validés par le Contrôle de gestion ; la Direction clôture.
 7. Une fiche Restreint est introuvable pour un utilisateur non autorisé ; export du PDF A3 ;
     relance manuelle.

Passation à la SAR (TRD 17). Code versionné (étiquette v1.0-demo ), dump de la base de
démo et seeders, README d'installation classique (prérequis, composer install , .env ,
 key:generate , migrate --seed , npm ci , npm run build , cron schedule:run , droits
sur storage/ ), document des points d'extension (LDAP via AuthProvider , SAP via
 SapGateway , SMTP, antivirus, déploiement et sauvegardes), PRD, TRD, plan de conception
v3 et ce plan, liste des points ouverts. Docker n'est pas fourni.

## 8. Risques et parades
Le risque principal est le délai : P1 tient en 9 jours à deux, sans marge.

   Risque                                         Parade

   P1 non terminé le vendredi 23                  Ordre de renoncement (section 5) ; revue de
                                                  jalon le 23 ; aucun nouveau lot avant que le
                                                  parcours complet passe.

   Versions incompatibles (Laravel 13.35.0,       Relevé et test dès le jour 1 ; versions notées
   React 19.2.5, PHP, Node, PostgreSQL)           dans le README.

   Dompdf ne tient pas la mise en page A3         Test de rendu le jour 3 ; tableaux plutôt que
                                                  flex ; repli sur une page imprimable.

Untitled

   Risque                                         Parade

   Conflits Git entre les deux développeurs       Un seul auteur des migrations jusqu'au jour 2
                                                  ; branches courtes ; fusion chaque soir ;
                                                  fichiers de routes et de thème découpés par
                                                  module.

   Règle de re-vérification après échec (D2)      Délai de 30 jours rendu paramétrable ; la
   non validée                                    boucle T11 reste disponible.

   Panne ou perte de données sur le PC de         Dump de la base et dépôt copiés sur un
   démo                                           second support le 29 octobre ;
                                                   migrate:fresh --seed en moins de deux
                                                  minutes ; captures du parcours en dernier
                                                  recours.

   Domaine d'hébergement SAR inconnu pour         Configuration par variables d'environnement
   Sanctum                                        ; point noté dans le document de passation.

   Sécurité non auditée                           Les contrôles du TRD 14 sont testés ; le
                                                  rapport de passation rappelle que ce n'est
                                                  pas une certification (TRD 14).

## 9. Points à trancher
Ces points ne sont pas inventés par l'équipe : l'hypothèse du plan s'applique en attendant
la confirmation.

   Point                          Hypothèse du plan                 À confirmer          Avant
                                                                    avec                 le

   Date de la démo                Vendredi 30 octobre               Encadrant de         14 oct.
                                                                    stage

   Versions PHP, Node,            Relevées au jour 1 (L0)           Binôme               13 oct.
   Composer, PostgreSQL

   Références SAP saisies à la    Stockées dans                     Binôme               13 oct.
   main (C3)                      references_sap

   Types d'action                 Corrective, préventive,           Amélioration         16 oct.
                                  amélioration                      continue

   Empreinte de domaine (C5)      Hachage des risques et actions    Amélioration         20 oct.
                                  du domaine                        continue

Untitled

   Point                         Hypothèse du plan                  À confirmer    Avant
                                                                    avec           le

   Valideurs Qualité, Sûreté,    Qualité → HSE, Sûreté →            Amélioration   20 oct.
   Autres                        Procédé / Technique, Autres        continue
                                 choisi par le pilote

   Re-vérification après échec   Une vérification à 30 jours de     Amélioration   22 oct.
   (D2)                          l'action corrective                continue

   Formules de gains             Gain net = A − B ; payback = B ÷   Contrôle de    22 oct.
                                 A                                  gestion

   Administrateur fonctionnel    Consultation seule                 SAR            26 oct.
   et fiches Restreint

   Politique de mot de passe     10 caractères minimum              SAR            27 oct.

   Valideur déclarant (C7)       La matrice prime : affectation     Binôme         15 oct.
                                 Agent en plus
