# UX/UI Design P13 — Fiche A3 numérique SAR

- **Date :** 13 octobre 2026
- **Auteur :** @ibzer

---

UX/UI Design P13 — Fiche A3 numérique
SAR
  Oct 13, 2026   · @ibzer

L'application est un outil de bureau (PC, 1280 px minimum) en français : on se connecte, on
arrive sur un tableau de bord propre au profil actif, et un menu latéral n'affiche que ce que
ce profil a le droit de faire. Ce document décrit les écrans dans leur ordre de construction,
la charte (couleurs de colors.css , logo SAR) et la structure du code.


## 1. Ordre des écrans
On construit de l'extérieur vers l'intérieur : la porte d'entrée, la coque (menu et barre
supérieure), l'administration qui alimente tout, puis le cœur de métier. Les jours renvoient
au plan d'implémentation.

  Étape Écran                 Route                       Profils         Fichier              Jour

  1        Connexion          /connexion                  Public          Login.jsx            2

  2        Inscription        /inscription                Public,         Register.jsx         2
           temporaire                                     développement
           (supprimée                                     seulement
           avant la
           livraison)

  3        Coque : menu       toutes les routes privées   Tous            AppLayout.jsx        3
           latéral et barre
           supérieure

  4        Tableau de bord    /tableau-de-bord            Tous sauf TNI   Dashboard.jsx        3à9
           (squelette, puis
           indicateurs au
           jour 9)

  5        Administration :   /admin/...                  Admin           pages/admin/         4
           utilisateurs,                                  fonctionnel
           affectations,
           unités,
           équipements,
           listes,
           paramètres

  6        Registre des       /fiches                     Tous sauf TNI   Fiches.jsx           5
           fiches

  7        Déclaration        /fiches/nouvelle            Agent, Pilote   FicheNouvelle.jsx    5
           d'une fiche

  Étape Écran                  Route                       Profils            Fichier                 Jour

  8        Fiche : 12          /fiches/:id                 Selon visibilité   FicheDetail.jsx         6à8
           sections,
           actions,
           contrôles,
           validations,
           historique

  9        Validations à       /validations                Valideurs,         Validations.jsx         7
           traiter                                         Contrôle de
                                                           gestion,
                                                           Direction

  10       Notifications       /notifications              Tous sauf TNI      Notifications.jsx       9

  11       Pièces jointes,     dans /fiches/:id            Selon droits       composants de la        10
           commentaires,                                                      fiche
           confidentialité
           (onglets de la
           fiche)

  12       Mot de passe        /mot-de-passe-oublie ,      Public             ForgotPassword.jsx ,    11 à 12
           oublié et           /reinitialisation/:jeton                       ResetPassword.jsx
           réinitialisation

  13       État technique      /technique                  Admin              Technique.jsx           12
           (SMTP,                                          technique
           authentification,
           journal)

  14       Pages d'erreur :    /403 , *                    Tous               Forbidden.jsx ,         3
           accès refusé,                                                      NotFound.jsx
           introuvable,
           session expirée


## 2. Charte graphique
Le rouge SAR #E60012 est réservé aux actions principales, aux liens et aux accents ; le
reste de l'interface est blanc et gris très clair. Toutes les valeurs viennent de colors.css ,
copié tel quel dans src/theme/colors.css et transposé dans le thème Material UI.


### 2.1 Couleurs de base

   Rôle                          Variable               Valeur                 Usage

   Marque                         --brand-500           #E60012                Boutons principaux,
                                                                               liens, accents

   Rôle                       Variable              Valeur                  Usage

   Marque, survol               --brand-600         #B8000E                 Survol des boutons et
                                                                            liens

   Marque, clic                 --brand-700         #8F000B                 État enfoncé

   Marque, fond léger           --brand-50          #FDECEE                 Item de menu actif,
                                                                            notification non lue

   Marque, halo                 --brand-100         #FAD1D5                 Sélection

   Fond de page                 --gray-50           #F7F7F8                 Arrière-plan de
                                                                            l'application

   Carte                        --white             #FFFFFF                 Cartes, menu, barre
                                                                            supérieure

   En-tête de tableau,          --gray-100          #F0F0F2                 Tableaux, champs en
   champ désactivé                                                          lecture seule

   Bordure                      --gray-200 / -      #E5E5E8 /               Séparateurs / bordures
                              -gray-300             #D2D2D8                 de champs

   Texte secondaire             --gray-500          #6B6B76                 Légendes, aides

   Texte de navigation          --gray-700          #3A3A44                 Menu latéral

   Texte principal              --ink               #1A1A1F                 Titres et texte

   Focus clavier                --focus-ring        rgba(37, 99,            Anneau de focus
                                                    235, 0.35)


### 2.2 Messages système

   Type               Texte       Fond         Bordure       Bouton plein

   Succès             #167A4A      #E8F6EF       #A8DCC3      #167A4A , texte blanc

   Erreur             #C62828      #FDECEC       #F3B5B5      #C62828 , texte blanc

   Avertissement      #8A5A00      #FFF4DD       #F5D08A      #F5A524 , texte encre

   Information        #1D4ED8      #EAF1FE       #B7CDF8      #2563EB , texte blanc

Le rouge d'erreur est proche du rouge de marque : un message d'erreur ou un refus ne
passe jamais par la couleur seule, il porte toujours une icône et un libellé. Les boutons
destructeurs (Refuser, Annuler l'action) sont en contour, jamais en rouge plein.


### 2.3 Statuts de la fiche

   Étape                                               Texte        Fond          Variable

   Ouvert                                               #8A5A00      #FFF4DD      --st-ouvert

   En cours                                             #1D4ED8      #E8F0FE      --st-encours

   En validation du plan, En validation de clôture      #6D28D9      #F1EAFE      --st-validation

   Réalisation des actions                              #0E7490      #E0F5F9      --st-realisation

   Mesure des résultats                                 #0369A1      #E1F1FA      --st-mesure

   Vérification du maintien                             #4338CA      #ECEBFD      --st-maintien

   En attente                                           #C2410C      #FFEDE3      --st-attente

   Clôturé                                              #167A4A      #E8F6EF      --st-cloture

Les huit étapes s'affichent en pastille (texte coloré sur fond pâle, coins arrondis). Les
quatre statuts généraux (Ouvert, En cours, En attente, Clôturé) reprennent les couleurs
de leur étape correspondante dans les listes et les graphiques.


### 2.4 Actions, confidentialité, graphiques

   Élément                   Valeurs

   Statuts d'action          À faire gris ( --action-a-faire ), En cours bleu,
                             Réalisée vert, Annulée gris clair, En retard rouge --
                             error avec icône d'horloge

   Confidentialité           Normal : gris, pastille discrète ; Restreint : pastille
                             encre ( #1A1A1F ) à texte blanc avec icône cadenas

   Séries de graphiques       #E60012 , #2563EB , #167A4A , #F5A524 , #6D28D9 ,
                              #0E7490 , #A8A8B3 , dans cet ordre ; chaque série
                             est aussi étiquetée directement


### 2.5 Typographie, espacements, formes

   Élément                    Règle

   Police                     Inter (hébergement local via @fontsource/inter ,
                              aucune ressource externe) ; hypothèse, la SAR n'a
                              pas fourni de police

   Élément                 Règle

   Titre de page (H1)      24 px, 600, interligne 32 px

   Titre de section (H2)   20 px, 600

   Sous-titre (H3)         16 px, 600

   Texte courant           14 px, 400, interligne 20 px

   Tableaux et légendes    13 px et 12 px

   Nombres en FCFA         séparateur de milliers, aucune décimale : 1 250
                           000 FCFA

   Dates                   13/10/2026 , fuseau d'affichage Africa/Dakar

   Espacement              échelle de 4 px (4, 8, 12, 16, 24, 32) ; marge de page
                           24 px

   Coins                   8 px (cartes, fenêtres), 6 px (champs et boutons),
                           999 px (pastilles)

   Ombres                  une seule, très légère, sur les cartes et menus
                           déroulants ; bordures de 1 px --border pour le
                           reste

   Icônes                  Material UI Icons, contour, 20 px

   Logo                    ovale rouge « sar » sur fond blanc, sans déformation
                           : 40 px de haut dans le menu, 64 px sur la
                           connexion ; demander une version SVG ou PNG
                           transparente à la SAR


## 3. Structure générale de l'interface
Après la connexion, toutes les pages privées partagent la même coque : un menu latéral
fixe à gauche, une barre supérieure fixe en haut, et une zone de contenu qui défile.

   +----------------+---------------------------------------------------+
   | [logo SAR]          |   Fiches > A3-2026-014                 [Profil v] (cloche) (JD)|
   Topbar 64 px
   |                     +---------------------------------------------------+
   |       Tableau de    | Titre de la page (H1)               [Action principale]|
   |        bord         |   ------------------------------------------------ |
   |       Fiches        |                                                            |
   |       Nouvelle fiche|    Zone de contenu (fond gris très clair,                   |
   |       Validations   |    cartes blanches, marge 24 px)                           |
   |       Notifications |                                                            |
   |       ------------ |                                                             |
   |       Administration|                                                            |
   |       Utilisateurs |                                                             |
   |       ...           |                                                            |
   |       (réduire <)   |                                                            |
   +----------------+---------------------------------------------------+
           Menu 260 px (72 px réduit)                  Largeur minimale 1280 px

   Zone                  Règle

   Menu latéral          Fond blanc, bordure droite 1 px ; logo en haut ; item
                         actif : fond --brand-50 , texte --brand-500 , trait
                         rouge de 3 px à gauche ; peut se réduire à des
                         icônes seules

   Barre supérieure      Fond blanc, bordure basse 1 px ; à gauche le fil
                         d'Ariane, à droite le sélecteur de profil, la cloche et
                         le menu utilisateur

   Contenu               Fond --bg-page , largeur maximale 1440 px,
                         centrée au-delà ; titre de page, actions et corps
                         dans des cartes blanches

   Fenêtres              Superposition --overlay , carte de 480 à 640 px ;
                         tiroir latéral de 480 px pour les formulaires
                         d'administration

   Largeur               PC uniquement, largeur minimale 1280 px ; en
                         dessous, une barre de défilement horizontale
                         apparaît, aucune mise en page mobile n'est prévue

Le template Elegent fournit cette coque ; on garde sa mise en page, on retire ses pages
inutiles et le multilingue, et on applique le thème SAR.


## 4. Connexion, inscription temporaire, mot de passe oublié
Les pages publiques ont la même forme : une carte blanche de 420 px centrée sur le fond
gris très clair, le logo SAR de 64 px au-dessus, un titre, le formulaire, un seul bouton rouge
pleine largeur.

                  [ logo SAR ]
           +------------------------------+
           | Connexion                    |
           |   Identifiant                      |
           |   [ jean.diop                    ] |
           |   Mot de passe                    |
           |   [ ************            (oeil)]|
           |   Mot de passe oublié ?            |
           |   [      Se connecter            ] |
           |   Créer un compte (test)           |
           +------------------------------+


### 4.1 Connexion ( /connexion )

   Champ ou élément             Règle

   Identifiant                  Obligatoire, focus au chargement

   Mot de passe                 Obligatoire, bouton pour afficher ou masquer

   Se connecter                 Bouton rouge ; passe en chargement (cercle)
                                pendant la requête et se désactive

   Mot de passe oublié ?        Lien vers /mot-de-passe-oublie

   Créer un compte              Lien discret visible uniquement si
                                VITE_ENABLE_DEV_REGISTER=true

   Échec                        Bandeau d'erreur sous le titre : « Identifiant ou mot
                                de passe incorrect. », identique pour un identifiant
                                inconnu et un mauvais mot de passe

   5 échecs en 15 min           Bandeau d'avertissement : « Trop de tentatives.
                                Réessayez dans N minutes. » ; bouton désactivé
                                (réponse 429)

   Session expirée              Bandeau d'information : « Votre session a expiré.
                                Reconnectez-vous. » après une réponse 401 ou 30
                                minutes d'inactivité

   Champ ou élément        Règle

   Après succès            Redirection vers /tableau-de-bord du profil
                           principal ; si l'utilisateur a plusieurs affectations, le
                           profil principal est proposé par défaut


### 4.2 Inscription temporaire ( /inscription )
Cette page n'existe que pour aller vite au début : le PRD interdit l'inscription libre (13.1), les
comptes sont créés par l'administrateur fonctionnel. Elle porte un bandeau
d'avertissement « Page temporaire de développement — sera supprimée ».

   Champ                           Règle

   Prénom, Nom                     Obligatoires

   Identifiant                     Obligatoire, unique

   Courriel                        Obligatoire, format valide, unique

   Mot de passe, Confirmation      10 caractères minimum, identiques

   Rôle de test                    Liste des sept profils, pour essayer chaque menu ;
                                   crée l'affectation correspondante

   Unité                           Liste des unités ; vide pour Direction, Contrôle de
                                   gestion et administrateurs (affectation globale)

Pour la supprimer : retirer Register.jsx , sa route dans App.jsx , le lien de la connexion,
la variable VITE_ENABLE_DEV_REGISTER et la route API temporaire côté Laravel. La route
API n'est enregistrée que si APP_ENV=local , et un test vérifie qu'elle est absente hors
développement.


### 4.3 Mot de passe oublié et réinitialisation

   Écran                                          Contenu

    /mot-de-passe-oublie                          Un champ Identifiant ou courriel ; message de
                                                  confirmation toujours identique : « Si un
                                                  compte existe, un lien a été envoyé. » ; 3
                                                  demandes par heure et par adresse (429)

   Écran                                     Contenu

    /reinitialisation/:jeton                 Nouveau mot de passe et confirmation (10
                                             caractères minimum) ; jeton valable 60
                                             minutes, à usage unique ; lien invalide ou expiré
                                             : message avec retour vers la demande

   Premier mot de passe d'un nouveau         Même écran, titre « Définir votre mot de passe
   compte                                    »

   Compte annuaire (LDAP)                    Demande refusée avec un message neutre ;
                                             aucun mot de passe n'est géré par l'application

   Démonstration                             Le courriel n'est pas envoyé : le lien est écrit
                                             dans le journal technique (transport log )


## 5. Menu latéral par rôle et barre supérieure
Le menu dépend du profil actif (rôle de l'affectation choisie), pas seulement de
l'utilisateur : quand le profil change, le menu et le tableau de bord changent. Masquer une
entrée n'est qu'un confort ; le serveur refuse toujours l'opération (PRD 2.5).

  Entrée du menu     Route                   Agent   Pilote   Valideur   Contrôle   Direction   Admin         Admin
                                                              métier     de                     fonctionnel   technique
                                                                         gestion

  Tableau de bord    /tableau-de-bord        O       O        O          O          O           O             —

  Fiches             /fiches                 O       O        O          O          O           O             —

  Nouvelle fiche     /fiches/nouvelle        O       O        —          —          —           —             —

  Validations à      /validations            —       —        O          O          O           —             —
  traiter

  Notifications      /notifications          O       O        O          O          O           O             —

  Administration >   /admin/utilisateurs     —       —        —          —          —           O             —
  Utilisateurs

  Administration >   /admin/affectations     —       —        —          —          —           O             —
  Affectations

  Administration >   /admin/unites           —       —        —          —          —           O             —
  Unités

  Administration >   /admin/equipements      —       —        —          —          —           O             —
  Équipements

  Administration >   /admin/listes           —       —        —          —          —           O             —
  Listes de choix

  Administration >   /admin/parametres-      —       —        —          —          —           O             —
  Paramètres         fonctionnels
  fonctionnels

  État technique     /technique              —       —        —          —          —           —             O

Le profil Admin technique n'a qu'une entrée : sa page d'accueil est /technique , car il n'a
aucun accès au contenu des fiches. Les rubriques d'administration sont regroupées sous
un titre repliable « Administration », séparé du reste par un trait. Les entrées avec
compteur affichent une pastille : Validations à traiter (nombre de demandes),
Notifications (non lues).

Barre supérieure

   Élément                              Comportement

   Fil d'Ariane                         « Fiches > A3-2026-014 » ; le dernier élément est le
                                        titre de la page

   Sélecteur de profil                  Liste déroulante « Rôle — Unité » (par exemple «
                                        Pilote — Unité 2 ») ; visible même avec une seule
                                        affectation, désactivé dans ce cas ; le changement
                                        appelle POST /auth/profil-actif puis recharge
                                        le menu et le tableau de bord

   Élément                      Comportement

   Cloche                       Pastille rouge avec le nombre de notifications non
                                lues ; compteur mis à jour au chargement puis
                                toutes les 60 secondes ; clic : liste des cinq
                                dernières et lien « Tout voir » ; cliquer une
                                notification la marque lue et ouvre la fiche

   Menu utilisateur             Initiales, nom, rôle actif ; « Se déconnecter »

   Avertissement de session     Fenêtre « Votre session expire dans 2 minutes »
                                avec « Rester connecté », 2 minutes avant
                                l'expiration des 30 minutes d'inactivité


## 6. Tableau de bord par profil
Chaque profil voit une ligne de cartes de chiffres, puis une liste de ce qu'il doit traiter et
un graphique. Aucune donnée n'est affichée hors du périmètre autorisé : les chiffres sont
calculés par le serveur ( GET /tableau-de-bord , GET /kpi ).

   +----------+ +----------+ +----------+ +----------+
   | Fiches   | | Actions | | Valida- | | Gain net |                   Cartes : 24 px de
   marge,
   | ouvertes | | en retard| | tions en | | annuel |                   chiffre 28 px, légende
   12 px
   |   42      | |     7   (!) | | attente 5| | 12,4 M           |
   +----------+ +----------+ +----------+ +----------+
   +--------------------------+ +----------------------------+
   | Fiches par statut              | | À traiter                        |
   | (barres, couleurs st-*)        | | A3-2026-014        Valider (3 j)|
   |                                | | A3-2026-009        Relancer (9 j)|
   +--------------------------+ +----------------------------+

   Profil             Cartes                                   Listes et graphiques

   Agent              Mes fiches ; mes actions à faire ;       Mes fiches par statut ; mes
                      mes actions en retard                    actions à faire

   Pilote             Mes fiches ; actions en retard ;         Validations en attente avec
                      validations en attente ; contrôles       ancienneté ; échéances à venir ;
                      disponibles                              contrôles J+30/60/90 disponibles

   Valideur métier    Fiches à valider ; décisions récentes    Fiches à valider avec ancienneté ;
                                                               dernières décisions

   Profil           Cartes                                     Listes et graphiques

   Contrôle de      Gains à valider ; gains validés de         Liste des gains à valider avec
   gestion          l'année ; gain net annuel validé           montants
                    (FCFA)

   Direction        Fiches ouvertes ; taux de clôture ;        Répartition par unité, par type
                    délai moyen de clôture ; fiches avec       d'amélioration et par origine ;
                    contrôles terminés ; gain net annuel       fiches et actions en retard
                    validé ; actions en retard ;
                    validations en attente

   Admin            Fiches sans pilote ; affectations ;        Relances à effectuer ; vue globale
   fonctionnel      listes à maintenir                         des fiches

   Admin            Nombre de comptes ; état de                Événements techniques récents
   technique        l'authentification ; état du courriel      (page /technique )

Règles : les actions en retard portent une icône et la couleur d'erreur ; l'ancienneté d'une
demande s'affiche en jours (« 3 j ») ; chaque ligne d'une liste mène à la fiche ; un tableau de
bord sans données affiche un état vide avec une phrase d'aide, jamais un tableau vide.


## 7. Registre et déclaration d'une fiche


### 7.1 Registre ( /fiches )
Une carte avec, de haut en bas : titre et bouton « Nouvelle fiche » (visible pour Agent et
Pilote), barre de recherche et de filtres, tableau, pagination.

   Élément           Détail

   Recherche         Texte libre sur le numéro et le titre

   Filtres           Statut, type d'amélioration, unité, pilote, origine,
                     période (dates), équipement, confidentialité ;
                     bouton « Réinitialiser » ; filtres actifs affichés en
                     pastilles supprimables

   Colonnes          N° A3, Titre, Unité, Pilote, Étape (pastille de statut),
                     Date cible, Confidentialité (pastille), Ancienneté,
                     bouton « Voir »

   Tri               Clic sur l'en-tête (N° A3, Date cible, Ancienneté) ;
                     tri par défaut : les plus récentes d'abord

   Pagination        Serveur ; 10, 25, 50 ou 100 lignes (100 au maximum)

   Élément             Détail

   Ligne               Toute la ligne est cliquable ; une fiche en retard
                       d'échéance affiche une icône d'horloge

   État vide           « Aucune fiche ne correspond à vos critères » et un
                       bouton « Réinitialiser les filtres »

   Fiche non visible   Aucune ligne et aucun compteur : une fiche
                       Restreint n'apparaît ni dans la liste, ni dans la
                       recherche, ni dans les totaux


### 7.2 Déclaration ( /fiches/nouvelle )
La déclaration est volontairement courte : l'agent la remplit en une étape, le pilote
complète le reste ensuite.

   Champ                  Type                         Règle

   Titre                  Texte                        Obligatoire

   Unité                  Liste déroulante             Obligatoire

   Origine                Liste déroulante             Obligatoire ; si « Autre », un champ de
                                                       précision apparaît

   Énoncé du              Zone de texte                Obligatoire (faits, lieu, période, fréquence)
   problème

   Équipement             Liste avec recherche         Recommandé quand il est identifié ; filtré
                                                       par l'unité choisie

   Confidentialité        Bascule Normal /             Normal par défaut
                          Restreint

Le bouton « Déclarer la fiche » crée la fiche, lui donne son numéro ( A3-2026-014 , remis à
001 chaque année) et ouvre son écran. Le déclarant, la date et le statut initial « Ouvert »
sont automatiques. Les erreurs 422 s'affichent sous le champ concerné.


## 8. Écran de la fiche ( /fiches/:id )
C'est l'écran central : il porte le formulaire en 12 sections, le suivi du workflow et toutes les
actions possibles. Un en-tête fixe reste visible pendant le défilement, les onglets séparent
la fiche de ses éléments liés.

   +-----------------------------------------------------------------+
   | A3-2026-014 Réduire la consommation de vapeur    [Soumettre le plan]|
   | (Réalisation des actions) (En cours) (Normal) v2             [...Plus v]       |
   | Unité 2 - Pilote : A. Fall - Cible : 30/11/2026                                 |
   | [Fiche] [Actions] [Contrôles] [Validations] [Pièces jointes]                   |
   | [Commentaires] [Historique]                                                    |
   +------------+----------------------------------------------------+
   | 1 Identif. | Section 5 — Analyse des causes racines                        |
   | 2 Contexte | Méthode : [5 Pourquoi v]                                      |
   | 3 Situation| +--------------------------------------------+                |
   | 4 Objectif | | N° | Catégorie | Libellé | Niveau | Racine   |                  |
   | 5 Causes <-| +--------------------------------------------+                |
   | 6 Contre-m.| [+ Ajouter une cause]                                         |
   | ...            |                                                           |
   | 12 Valid. | (non enregistré)    [Précédent] [Enregistrer] [Suiv.]|
   +------------+----------------------------------------------------+


### 8.1 En-tête et onglets

   Élément               Contenu

   Ligne 1               N° A3 et titre ; boutons d'action à droite

   Ligne 2               Pastille d'étape, pastille de statut général,
                         confidentialité, version de la fiche

   Ligne 3               Unité, pilote, date cible, équipement, références
                         SAP

   Onglet Fiche          Les 12 sections avec navigation par étapes
                         (colonne de gauche) et progression

   Onglet Actions        Tableau des actions avec statut, responsable,
                         échéance, MOC ; actions en retard en rouge avec
                         icône

   Onglet Contrôles      Trois contrôles J+30, J+60, J+90 par action réalisée
                         : échéance, résultat (conforme ou non),
                         commentaire ou preuve ; un échec ouvre la
                         création de l'action corrective

   Onglet Validations    Demandes des portes 1 et 2 : valideur, décision,
                         date, commentaire, ancienneté ; bouton « Relancer
                         » sur une demande en attente

   Élément                 Contenu

   Onglet Pièces jointes   Dépôt de fichiers (PDF, PNG, JPEG, DOCX, XLSX,
                           PPTX ; 10 Mo, 20 fichiers), liste avec
                           téléchargement

   Onglet Commentaires     Fil général avec auteur, date et contexte

   Onglet Historique       Journal lisible par le pilote, la Direction et
                           l'administrateur fonctionnel : dates, auteur, ancien
                           et nouveau contenu


### 8.2 Boutons d'action (selon l'étape, le rôle et les droits)

   Bouton                  Qui le voit          Quand                     Effet

   Désigner le pilote      Admin                Étape Ouvert              Choix parmi les
                           fonctionnel                                    titulaires du rôle
                                                                          Pilote de l'unité

   Commencer l'analyse     Pilote               Ouvert, pilote            T2
                                                désigné

   Soumettre le plan       Pilote               En cours                  T3 ; si une condition
                                                                          manque, un panneau
                                                                          rouge liste les
                                                                          manques (méthode,
                                                                          indicateur principal,
                                                                          cause, action,
                                                                          domaines, valideur
                                                                          affecté)

   Approuver, Refuser      Valideur sollicité   Demande active            Refuser ouvre une
                                                                          fenêtre avec
                                                                          commentaire
                                                                          obligatoire

   Terminer les actions,   Pilote               À chaque étape            T6, T7, T8 avec les
   Saisir la mesure,                            correspondante            conditions B3 et B4
   Soumettre la clôture

   Valider les gains       Contrôle de          Porte 2, gains            Valide ou refuse
                           gestion              chiffrés                  chaque gain

   Approuver la clôture    Direction            Porte 2                   T9

   Bouton                   Qui le voit          Quand                     Effet

   Mettre en attente,       Pilote, Direction    Étapes actives            Motif obligatoire
   Lever le blocage

   Relancer                 Pilote, Direction,   Action en retard ou       Une relance par 24 h
                            Admin                validation en attente     et par cible ; au-delà,
                            fonctionnel                                    message « Déjà
                                                                           relancé il y a moins de
                                                                           24 h »

   Exporter en PDF A3       Tout lecteur de      Toujours                  PDF paysage des 12
                            la fiche                                       sections

   Changer la               Pilote, Admin        Toujours                  Bascule Normal /
   confidentialité          fonctionnel                                    Restreint, motif
                                                                           conseillé, journalisé

Si une transition est refusée parce que la fiche a changé entre-temps (409), un message
invite à recharger ; si une condition n'est pas remplie (422), la liste des manques est
affichée sans perdre la saisie.


### 8.3 Les 12 sections
Chaque section est une carte avec son titre, une aide courte, un indicateur de complétude
(point gris, orange ou vert) dans la colonne de gauche, et des champs obligatoires
marqués d'un astérisque. L'enregistrement est toujours explicite (bouton « Enregistrer »),
car l'historique métier note chaque enregistrement du pilote (PRD 14) ; une fenêtre
prévient si l'on change de section ou quitte la page avec des modifications non
enregistrées.

   Section                                Composants


## 1. Identification                      Titre, unité, équipement (liste avec recherche), n°
                                          d'avis SAP et n° d'ordre SAP (texte, aide « saisie
                                          manuelle »), pilote (lecture seule), équipe, sponsor,
                                          dates de lancement et cible (sélecteur de date),
                                          type d'amélioration, origine (+ précision si Autre),
                                          confidentialité, statut (pastille)


## 2. Contexte, enjeu et problème         Contexte, énoncé du problème, fréquence (liste),
                                          cinq impacts (HSE, production, qualité, énergie et
                                          environnement, sûreté et cybersécurité) en volets
                                          repliables, impact financier estimé en FCFA

   Section                                Composants


## 3. Situation actuelle                  Tableau des indicateurs : libellé, unité, sens (hausse
                                          ou baisse), référence ou cible, valeur actuelle, écart
                                          (calculé, lecture seule), source et période ; étoile
                                          sur l'indicateur principal


## 4. Objectif                            Objectif SMART, périmètre, KPI principal (liste des
                                          indicateurs), KPI à ne pas dégrader (choix
                                          multiple), résultats attendus


## 5. Analyse des causes racines          Méthode (5 Pourquoi, Ishikawa, Pareto, Autre
                                          précisée) ; tableau des causes : n°, catégorie,
                                          libellé, niveau, cause racine (case), preuve ; avec « 5
                                          Pourquoi », affichage en chaîne des niveaux


## 6. Plan de contre-mesures              Tableau des actions : cause traitée, description,
                                          type, responsable, échéance, coût estimé en FCFA,
                                          statut ; chaque action est rattachée à une cause


## 7. Risques et MOC                      Cases des domaines concernés (le panneau «
                                          Valideurs qui seront sollicités » se met à jour) ;
                                          tableau des risques : domaine, description, MOC
                                          nécessaire, référence, statut et preuve de la MOC,
                                          mesure de maîtrise, responsable ; bandeau
                                          d'information sur la gestion du changement


## 8. Résultats après action              Mesures Avant, Après, Cible, écart, amélioration en
                                          % (« Non calculable » si la référence est nulle),
                                          période de vérification ; objectif atteint : Oui,
                                          Partiellement (écart et suite à préciser), Non


## 9. Gains économiques                   Lignes de gain : catégorie, hypothèse de calcul,
                                          quantité, unité, coût unitaire, montant annuel
                                          (calculé), statut (proposé, validé, refusé) ; totaux :
                                          A, coût de mise en œuvre B, gain net, délai de
                                          retour ; case « Sans gain chiffré »


## 10. Standardisation et pérennisation   Tableau : type (SOP, paramètres, formation, plan de
                                          maintenance, KPI au tableau de bord), responsable,
                                          date, statut, preuve ; renvoi vers l'onglet Contrôles
                                          pour les audits J+30/60/90


## 11. Leçons apprises                    Cinq zones de texte : ce qui a fonctionné, ce qui n'a
                                          pas fonctionné, standard à répliquer, retour
                                          d'expérience, projet suivant

   Section                                Composants


## 12. Validation                         Lecture seule : fonction, nom, date, décision,
                                          commentaire, version ; date de clôture

Une section non modifiable pour le profil ou l'étape en cours s'affiche en lecture seule
(fond gris, sans bouton d'enregistrement).


## 9. Validations, notifications, administration, état technique


### 9.1 Validations à traiter ( /validations )
Tableau des demandes qui attendent le profil actif : N° A3, titre, porte (1 ou 2), rôle
demandé, ancienneté en jours, boutons « Ouvrir », « Approuver », « Refuser ». Les plus
anciennes sont en haut ; au-delà d'un seuil l'ancienneté passe en orange (aucun délai
automatique n'est imposé). Refuser ouvre une fenêtre avec commentaire obligatoire. Un
valideur n'agit que sur une demande de l'étape active, et jamais sur une fiche dont il est le
pilote.


### 9.2 Notifications ( /notifications )
Liste paginée : message, fiche liée, date, pastille « non lu » (fond --brand-50 ). Boutons «
Marquer comme lu » et « Tout marquer comme lu ». Une notification dont l'élément est
résolu ou dont le destinataire a perdu le droit d'accès disparaît. Pas de courriel : tout reste
dans l'application.


### 9.3 Administration (administrateur fonctionnel)
Chaque page d'administration est un tableau avec recherche, un bouton « Ajouter » en
haut à droite et un tiroir latéral pour créer ou modifier. Rien n'est supprimé : on désactive
(interrupteur « Actif »), pour garder l'historique.

   Page                 Tableau                                Tiroir de saisie

   Utilisateurs         Identifiant, nom, courriel, source     Identifiant, courriel, nom,
                        (locale ou annuaire), actif,           prénom, source ; bouton «
                        dernière connexion                     Envoyer le lien de définition du
                                                               mot de passe »

   Affectations         Utilisateur, rôle, unité ou « Global   Utilisateur, rôle, unité (vide si
                        », début, fin, actif                   global), dates facultatives ; un
                                                               utilisateur peut cumuler
                                                               plusieurs affectations

   Page                 Tableau                                Tiroir de saisie

   Unités               Code, libellé, actif                   Code, libellé

   Équipements          Unité, code, libellé, référence SAP,   Unité, code, libellé, référence
                        actif                                  SAP (saisie manuelle)

   Listes de choix      Liste à gauche (types                  Code, libellé, ordre, actif ; les
                        d'amélioration, origines,              libellés historiques sont
                        fréquences, méthodes,                  conservés
                        catégories de cause, domaines,
                        types d'action) ; valeurs à droite,
                        réordonnables

   Paramètres           Formulaire : cadence des rappels       —
   fonctionnels         automatiques (7 jours par défaut),
                        option de rappel des validations,
                        taille maximale et nombre de
                        fichiers

L'administrateur fonctionnel désigne aussi le pilote d'une fiche depuis l'écran de la fiche ; il
ne voit aucun bouton d'approbation et ne modifie aucune donnée métier.


### 9.4 État technique ( /technique , administrateur technique)

   Bloc                Contenu

   Authentification    Fournisseur actif (local), nombre de comptes, état
                       du fournisseur annuaire (désactivé : point
                       d'extension de la SAR)

   Courriel            Formulaire SMTP : hôte, port, chiffrement,
                       utilisateur, mot de passe (jamais réaffiché),
                       expéditeur ; bouton « Envoyer un courriel d'essai » ;
                       en démonstration, mention « Transport : journal »

   Journal technique   Tableau des événements techniques et des
                       opérations d'administration, distinct de l'historique
                       des fiches

   SAP                 État « non branché » ( SAP_ENABLED=false )

Ce profil ne voit aucune fiche ni aucun contenu métier.


## 10. États, comportements et composants communs


### 10.1 Comportements transverses

   Situation                 Comportement

   Sauvegarde                Indicateur près du bouton : « Modifications non
                             enregistrées » (orange), « Enregistrement… »
                             (cercle), « Enregistré » (vert), « Échec de
                             l'enregistrement » (rouge, avec le motif) ; le succès
                             n'est affiché qu'après la réponse positive du
                             serveur

   Données invalides (422)   Messages sous les champs concernés ; si la règle
                             porte sur la fiche (garde du workflow), panneau «
                             Conditions manquantes » avec la liste

   Non connecté (401)        Retour à /connexion avec le bandeau de session
                             expirée ; la page demandée est mémorisée

   Accès interdit (403)      Page « Vous n'avez pas accès à cette page » avec
                             retour au tableau de bord

   Introuvable (404)         Page « Page introuvable » ; une fiche Restreint non
                             autorisée produit exactement le même écran, sans
                             révéler son existence

   Conflit (409)             Message « La fiche a changé entre-temps » et
                             bouton « Recharger »

   Trop de demandes (429)    Message avec le délai restant

   Erreur serveur (500)      Message générique ; aucun détail technique n'est
                             affiché

   Chargement                Squelettes gris pour les tableaux et cartes ; cercle
                             sur les boutons ; jamais d'écran blanc

   État vide                 Icône, phrase d'explication et action possible

   Confirmation              Fenêtre pour tout refus, blocage, annulation
                             d'action et changement de confidentialité ; le texte
                             du bouton reprend le verbe (« Refuser la demande
                             »)

   Session                   Avertissement 2 minutes avant l'expiration ;
                             l'interrogation des notifications ne prolonge pas la
                             session

   Situation                  Comportement

   Accessibilité              Contrastes de 4,5:1 pour le texte ; anneau de focus
                              visible sur chaque élément interactif ; navigation
                              complète au clavier ; libellé visible sur chaque
                              champ (le texte indicatif seul est insuffisant) ;
                              statut jamais indiqué par la seule couleur

   Langue                     Français uniquement, y compris les messages
                              d'erreur du serveur


### 10.2 Composants réutilisables

   Composant                        Rôle                             États

    Button                          Principal (rouge), secondaire    normal, survol, enfoncé,
                                    (contour gris), destructeur      focus, désactivé,
                                    (contour d'erreur avec           chargement
                                    icône), lien

    Input , Select , Textarea ,     Champs avec libellé, aide et     normal, focus, erreur,
    DatePicker , Switch             erreur                           désactivé, lecture seule

    MoneyInput                      Montant en FCFA, entier,         idem
                                    séparateur de milliers

    StatusBadge                     Pastille d'étape, de statut      une variante par valeur
                                    d'action ou de
                                    confidentialité avec les
                                    couleurs de la section 2

    KpiCard                         Carte de chiffre avec libellé    normal, chargement, vide
                                    et variation

    DataTable                       Tableau avec tri, pagination,    chargement, vide, erreur
                                    état vide, lignes cliquables

    FilterBar                       Recherche et filtres du          normal, filtres actifs
                                    registre avec pastilles
                                    actives

    SectionStepper                  Colonne des 12 sections          actif, complet, incomplet,
                                    avec indicateurs de              lecture seule
                                    complétude

    SaveIndicator                   État de sauvegarde               non enregistré, en cours,
                                                                     réussi, échec

   Composant                       Rôle                              États

    ConfirmDialog                  Confirmation, avec champ          ouvert, envoi
                                   de commentaire obligatoire
                                   si nécessaire

    Drawer                         Tiroir latéral d'administration   ouvert, envoi

    Alert                          Succès, erreur,                   quatre types
                                   avertissement, information,
                                   avec icône

    EmptyState , Skeleton          États vide et de chargement       —

    NotificationBell               Cloche, pastille et liste         aucune, non lues,
                                   courte                            chargement

    ProfileSwitcher                Sélecteur de profil actif         un profil (désactivé),
                                                                     plusieurs

    AuthPage                       Carte et logo communs aux         —
                                   pages de connexion,
                                   d'inscription et de mot de
                                   passe


## 11. Structure du code
On garde votre organisation ( components , pages , services , un fichier .css à côté de
chaque .jsx ) et on la prolonge : les composants sont rangés par domaine pour que les 12
sections de la fiche et les écrans d'administration ne noient pas le dossier.

   P13/
   ├── backend/                                          # API Laravel 13 (PHP)
   │   ├── app/
   │       │   ├── Contracts/                            # AuthProvider, SapGateway :
   points d'extension SAR
   │   │   ├── Console/Commands/                         # a3:relances (rappels
   automatiques)
   │       │   ├── Enums/                                # StatutEtape, StatutGeneral,
   StatutAction, Role, Confidentialite...
   │   │   ├── Http/
   │       │   │   ├── Controllers/Api/V1/               # AuthController,
   FicheController, ActionController...
   │   │   │   ├── Middleware/                           # inactivité de session, profil
   actif
   │       │   │   ├── Requests/                         # validation des entrées (Form

   Requests)
   │   │       │   └── Resources/                   # format uniforme des réponses
   JSON
   │       │   ├── Models/                           # Eloquent : User, FicheA3,
   Action, Controle...
   │   │       ├── Observers/                        # journal des modifications de
   champ
   │       │   ├── Policies/                         # droits par modèle et par
   opération
   │   │   └── Services/                            # règles métier
   │       │       ├── FicheWorkflow.php             # seul code qui change le statut
   d'une fiche
   │       │       ├── ValidationCircuit.php
   │       │       ├── ControleEfficaciteService.php
   │       │       ├── FicheVisibility.php          # portée Normal / Restreint
   │   │           ├── Calculs.php                   # formules (écart, gain net,
   payback)
   │       │       ├── NotificationService.php
   │       │       ├── RelanceService.php
   │       │       ├── HistoryLogger.php
   │       │       ├── PdfExporter.php
   │       │       ├── PieceJointeService.php
   │       │       ├── Auth/                     # LocalAuthProvider,
   LdapAuthProvider (squelette désactivé)
   │   │       └── Sap/                          # NullSapGateway, FakeSapGateway
   │   ├── config/a3.php                             # auth_provider=local,
   sap_enabled=false, paramètres
   │   ├── database/
   │   │   ├── migrations/                           # les 30 tables du PRD 12
   │       │   ├── factories/
   │       │   └── seeders/                         # DatabaseSeeder (base),
   DemoSeeder (démo uniquement)
   │   ├── resources/views/pdf/                      # modèle Blade du PDF A3 (seule
   vue Blade)
   │   ├── routes/api.php                            # /api/v1/...
   │   ├── storage/app/private/                      # pièces jointes (hors dossier
   public)
   │       ├── tests/{Feature,Unit}/                 # Pest sur PostgreSQL
   │       └── .env.example
   │
   ├── frontend/                                     # React 19 + Vite + Material UI
   (template Elegent adapté)
   │   ├── public/                                   # favicon, logo SAR
   │       ├── src/
   │       │   ├── assets/                           # images et icônes globales
   │       │   ├── components/

   │   │   │   ├── common/                          # briques réutilisables (un .jsx
   + un .css chacune)
   │   │   │   │   ├── Button.jsx / Button.css
   │   │   │   │   ├── Input.jsx / Input.css            # + Select, Textarea,
   DatePicker, MoneyInput, Switch
   │       │   │   │   ├── Alert.jsx / StatusBadge.jsx / KpiCard.jsx
   │       │   │   │   ├── DataTable.jsx / FilterBar.jsx
   │       │   │   │   ├── ConfirmDialog.jsx / Drawer.jsx
   │       │   │   │   ├── SaveIndicator.jsx / EmptyState.jsx / Skeleton.jsx
   │       │   │   │   └── ...
   │       │   │   ├── layout/                      # la coque de l'application
   │       │   │   │   ├── AppLayout.jsx / AppLayout.css
   │       │   │   │   ├── Sidebar.jsx / Sidebar.css    # menu selon le rôle actif
   │   │   │   │       ├── Topbar.jsx / Topbar.css
   │   │   │   │       ├── ProfileSwitcher.jsx / NotificationBell.jsx /
   Breadcrumb.jsx
   │   │   │   │   ├── ProtectedRoute.jsx              # connecté + rôle autorisé
   │   │   │   │   └── AuthPage.jsx / AuthPage.css     # carte commune connexion,
   inscription, mot de passe
   │   │       │   ├── dashboard/                   # cartes et graphiques par
   profil
   │   │       │   ├── fiche/
   │       │   │   │   ├── FicheHeader.jsx / FicheTabs.jsx / SectionStepper.jsx
   │       │   │   │   ├── WorkflowActions.jsx / MissingConditionsPanel.jsx
   │       │   │   │   ├── sections/                # Section01Identification.jsx
   ... Section12Validation.jsx
   │   │   │   │   └── tabs/                       # ActionsTab, ControlesTab,
   ValidationsTab,
   │   │   │   │                                   #   PiecesJointesTab,
   CommentairesTab, HistoriqueTab
   │   │   │   └── admin/                          # tiroirs et formulaires
   d'administration
   │   │   ├── pages/                               # une page par route
   │       │   │   ├── Login.jsx / Login.css
   │       │   │   ├── Register.jsx                 # TEMPORAIRE, à supprimer
   │       │   │   ├── ForgotPassword.jsx / ResetPassword.jsx
   │       │   │   ├── Dashboard.jsx / Dashboard.css
   │       │   │   ├── Fiches.jsx / FicheNouvelle.jsx / FicheDetail.jsx
   │       │   │   ├── Validations.jsx / Notifications.jsx / Technique.jsx
   │   │   │   ├── Forbidden.jsx / NotFound.jsx
   │   │   │   └── admin/                       # Utilisateurs, Affectations,
   Unites, Equipements,
   │       │   │                               #   Listes, ParametresFonctionnels
   │       │   ├── services/                       # communication avec l'API
   Laravel (Fetch)
   │   │   │   ├── api.js                           # client commun : cookies, CSRF,

   401, 422, 409, 429
   │       │   │   ├── authService.js / ficheService.js / actionService.js
   │       │   │   ├── validationService.js / notificationService.js
   │       │   │   └── adminService.js / dashboardService.js
   │   │   ├── hooks/                                    # useAuth, usePermissions,
   useNotifications (60 s),
   │   │   │                                             #    useSessionTimer,
   useSaveState
   │   │   ├── context/AuthContext.jsx                  # utilisateur et profil actif
   │   │   ├── theme/
   │   │       │   ├── colors.css                        # copie de colors.css (variables
   SAR)
   │   │   │   └── theme.js                              # thème Material UI alimenté par
   ces variables
   │   │   ├── utils/
   │   │   │       ├── format.js                         # FCFA, dates Africa/Dakar,
   ancienneté
   │   │   │       └── constants.js                      # étapes, statuts, menu par rôle
   │   │   ├── App.jsx                                   # routeur principal (routes
   publiques et privées)
   │   │   ├── main.jsx                                  # point d'entrée React
   │   │   └── index.css                                 # styles globaux (reset, police,
   import de colors.css)
   │   ├── .env.example                                  # VITE_API_URL,
   VITE_ENABLE_DEV_REGISTER
   │   ├── vite.config.js                                # proxy /api et /sanctum vers
   Laravel
   │   └── package.json
   │
   ├── docs/                                             # PRD, TRD, plan v3, plan
   d'implémentation, ce document
   │   └── points-extension.md                           # LDAP, SAP, SMTP, antivirus,
   déploiement (passation SAR)
   ├── .gitignore
   └── README.md                                         # installation classique,
   comptes de démo


### 11.1 Pour se repérer : de l'écran à l'API

   Route               Page             Service frontend            Contrôleur Laravel

   /connexion          Login.jsx            authService.js           AuthController

   /tableau-de-bord    Dashboard.jsx        dashboardService.js      TableauDeBordController

   /fiches             Fiches.jsx           ficheService.js          FicheController@index

   Route                 Page                Service frontend         Contrôleur Laravel

   /fiches/nouvelle      FicheNouvelle.jsx   ficheService.js          FicheController@store

   /fiches/:id           FicheDetail.jsx     ficheService.js ,        FicheController ,
                                             actionService.js         ActionController ,
                                                                      ControleController ,
                                                                      TransitionController

   /validations          Validations.jsx     validationService.js     ValidationController

   /notifications        Notifications.jsx   notificationService.js   NotificationController

   /admin/...            pages/admin/*.jsx   adminService.js          UserController ,
                                                                      AffectationController ,
                                                                      UniteController ,
                                                                      ListeController ...

   /technique            Technique.jsx       adminService.js          ParametreController ,
                                                                      JournalController


### 11.2 Conventions
     Un composant, deux fichiers : Nom.jsx et Nom.css , même dossier ; noms en
     PascalCase ; un composant ne dépasse pas environ 200 lignes.
     Aucune couleur en dur : les .css n'utilisent que les variables de colors.css ( var(--
     brand-500) ), et theme.js les lit pour Material UI.
     Sens des dépendances : une page appelle des composants et des hooks ; un hook
     appelle un service ; un service seul appelle fetch . Un composant ne fait jamais d'appel
     réseau.
     Client API : api.js envoie les cookies ( credentials: 'include' ), demande
       /sanctum/csrf-cookie avant la première écriture, joint l'en-tête X-XSRF-TOKEN , et
     traduit les réponses (401 déconnexion, 422 erreurs par champ, 409 conflit, 429 délai).
     Données : TanStack Query au-dessus des services pour le cache et l'interrogation de
     60 secondes des notifications ; React Hook Form et Zod pour les formulaires (TRD 4).
     Droits : usePermissions ne sert qu'à masquer ou désactiver un bouton ; la décision
     reste au serveur.
     Routes : en français sans accents, comme dans le PRD ; App.jsx regroupe les routes
     publiques, privées et réservées à un rôle.
     Aucun secret dans le code ni dans les variables VITE_* , qui sont publiques.
     Git : main stable, une branche par lot ( lot-L5-fiche-12-sections ), fusion chaque
     soir.

Deux écarts avec le TRD, à corriger dans ses prochaines versions : le dossier de
communication avec l'API s'appelle services/ ici (le TRD dit src/api ), et le PDF utilise
une vue Blade alors que le TRD dit « API uniquement » (la vue ne sert qu'au modèle
Dompdf).
