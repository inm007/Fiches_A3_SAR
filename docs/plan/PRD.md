# PRD v2 — Fiche A3 numérique SAR (P13)

**Date :** 13 octobre 2026  
**Auteur :** @nico

Oct 13, 2026      · @nico


1. Contexte, objectifs et cadre de livraison
P13 digitalise la fiche A3 d'amélioration continue de la SAR : une seule application pour
déclarer, analyser, valider, suivre et clôturer une amélioration, gains chiffrés compris.
Cette version 2 est écrite en cohérence avec le TRD v2 (13 octobre 2026) : le PRD fixe les
règles métier et les fonctions, le TRD fixe la technique, le plan d'implémentation fixe
l'ordre de réalisation. En cas de conflit, le PRD prime ; le plan de conception v3 reste la
source métier d'origine.


### 1.1 Cadre

  Élément                           Décision

  Projet                            Neuf : backend Laravel et frontend React
                                    initialisés, frontend adapté au template Elegent

  Équipe et délai                   Binôme ; 14 jours ouvrés, du mardi 13 au vendredi
## 30 octobre 2026

  Démonstration                     Sur le PC du binôme, fin de stage (vendredi 30
                                    octobre, à confirmer)

  Suite du projet                   La SAR termine l'application : branchement LDAP
                                    et API SAP. Le binôme les prépare sans les
                                    implémenter

  Principe                          Tout prévoir (modèle, API, écrans), réaliser selon
                                    les priorités de la section 15

  Dimensionnement                   Hypothèses de conception : 50 utilisateurs, 200
                                    fiches par an, 3 unités de démonstration


### 1.2 Objectifs
     Structurer et tracer la démarche, du problème constaté à la standardisation.
     Mesurer les gains (écart entre situation normale et situation dégradée) et les
     consolider en fin d'année.
     Offrir une source unique de déclaration, articulée avec SAP par des champs de
     référence, sans recopier ce que SAP gère déjà (incidents, avis, ordres, coûts).


Indicateurs de réussite : nombre de fiches ouvertes et taux de clôture ; délai moyen de
clôture ; part des fiches avec vérification d'efficacité renseignée ; gain net annuel validé
par le Contrôle de gestion.


### 1.3 Documents de référence

  Document                              Rôle

  Plan de conception v3                 Source métier d'origine (workflow, rôles, matrice
                                        de permissions, diagrammes)

  PRD v2 (ce document)                  Règles métier, fonctions, modèle de données (§12),
                                        critères d'acceptation

  TRD v2                                Architecture, API, sécurité, installation ; renvoie à
                                        ce PRD pour tout le métier

  Plan d'implémentation                 Ordre des phases et calendrier


### 1.4 Décisions de cadrage
Les décisions D1 à D14 reprennent les 24 réponses du binôme. Une valeur marquée «
hypothèse » vient d'un défaut ou d'un choix fait faute de réponse.


  N°         Sujet                                           Décision

  D1         Contrôles J+30, J+60, J+90                      Par action, à partir de sa date de réalisation ;
                                                             un échec exige une action corrective et une
                                                             nouvelle vérification. La boucle T11 du plan v3
                                                             reste valable au niveau de la fiche (§8)

  D2         Re-vérification après action                    Hypothèse : une seule vérification, à 30 jours
             corrective                                      de la réalisation de l'action corrective. À
                                                             valider avec l'amélioration continue

  D3         Authentification                                Connexion locale ; LDAP = point d'extension
                                                             (interface AuthProvider ) à brancher par la
                                                             SAR ; aucun accès LDAP aujourd'hui

  D4         Courriel                                        Seulement pour la définition et la
                                                             réinitialisation du mot de passe ; SMTP réglé
                                                             par l'administrateur technique ; transport
                                                             journal ( log ) en démonstration


  N°         Sujet                          Décision

  D5         SAP                            Champs de référence saisis à la main
                                            (équipement, n° d'avis, n° d'ordre) ; interface
                                            de lecture SapGateway préparée, API écrite
                                            par la SAR

  D6         Devise et gains                FCFA, entiers sans décimales ; gain annuel
                                            calculé (quantité × coût unitaire)

  D7         Relances                       Bouton manuel conservé ; rappels
                                            automatiques tous les 7 jours (paramètre)
                                            pour actions en retard et validations en
                                            attente ; aucun délai automatique imposé aux
                                            valideurs, ancienneté affichée

  D8         Pièces jointes                 Incluses ; PDF, PNG, JPEG, DOCX, XLSX, PPTX ;
## 10 Mo par fichier et 20 fichiers par fiche,
                                            paramétrables ; type réel vérifié ; pas
                                            d'analyse antivirus (extension SAR)

  D9         Administrateur fonctionnel     Gère comptes métier, affectations,
                                            référentiels, pilote et confidentialité ; ne
                                            modifie pas le contenu métier

  D10        Numéro de fiche                A3-AAAA-NNN, remis à zéro chaque année,
                                            attribué à la création

  D11        Rafraîchissement               Au chargement puis toutes les 60 secondes ;
                                            pas de WebSocket

  D12        Export et appareils            PDF A3 paysage seulement, pas d'export Excel
                                            ; PC uniquement (largeur minimale 1280 px)

  D13        Session                        30 minutes d'inactivité, avertissement 2
                                            minutes avant

  D14        Statut d'action Bloquée        Ajouté aux statuts d'action, motif obligatoire


Autres réponses reprises : template Elegent adapté à la charte SAR ; PostgreSQL imposé ;
aucun déploiement par le binôme ; unités administrables (3 en démonstration) ; fréquence
en liste déroulante ; livrables = code, base de démonstration, documents et guide
d'installation.


2. Rôles, affectations et droits
Les droits dépendent du rôle de l'affectation active, de l'unité, de l'état de la fiche, de sa
confidentialité, de l'opération et de l'identité de l'utilisateur ; le backend les contrôle à
chaque opération (TRD §8.4). Le plan v3 §3.3 est la base de la matrice ci-dessous.


### 2.1 Rôles

  Rôle                                             Fonction

  Agent                                            Déclare des fiches, suit ses déclarations,
                                                   met à jour les actions dont il est responsable

  Pilote                                           Spécialisation de l'Agent, désigné par fiche :
                                                   complète la fiche, gère actions, mesures,
                                                   gains proposés, contrôles ; soumet plan et
                                                   clôture

  Valideur Production / Exploitation               Approuve ou refuse le plan ; toujours
                                                   sollicité en premier

  Valideurs Maintenance, Procédé / Technique,      Approuvent ou refusent la partie de leur
  Inspection / Intégrité, HSE                      domaine

  Contrôle de gestion                              Valide ou refuse les gains chiffrés

  Direction                                        Vue globale, relance, mise en attente ; seule
                                                   à approuver la clôture

  Administrateur fonctionnel                       Comptes métier, rôles, affectations, unités,
                                                   référentiels, pilote, confidentialité ; aucun
                                                   contenu métier

  Administrateur technique (TNI)                   Paramètres techniques (SMTP, LDAP),
                                                   journaux techniques ; aucun accès au
                                                   contenu des fiches


### 2.2 Affectations et profil actif
Un rôle n'appartient pas à l'utilisateur : il est porté par une affectation (utilisateur, rôle,
unité ou périmètre global, dates de début et de fin facultatives). Un utilisateur peut être
pilote dans une unité et valideur dans une autre. Seul l'administrateur fonctionnel crée,
modifie ou désactive les affectations. À la connexion l'application propose le profil
principal ; l'utilisateur change de profil selon ses habilitations ( POST /auth/profil-
actif ) et le profil actif est mémorisé côté serveur.


### 2.3 Matrice des permissions
O = autorisé ; C = consultation seule ; — = interdit. Toute autorisation s'entend dans la
limite de la visibilité (§2.4) et de l'état de la fiche.


 Opération                        Agent   Pilote Valideur      Contrôle     Direction Admin        Admin
                                                 métier        de gestion            fonctionnel   technique

 Déclarer une fiche               O       O      —             —            —        —             —

 Consulter une fiche              O       O      O             O            O        O             —

 Désigner ou changer              —       —      —             —            —        O             —
 le pilote

 Compléter les                    —       O      —             —            —        —             —
 sections, enregistrer
 un brouillon

 Créer et modifier les            —       O      —             —            —        —             —
 actions

 Mettre à jour une                O       O      —             —            —        —             —
 action dont on est
 responsable

 Soumettre le plan                —       O      —             —            —        —             —
 (T3)

 Approuver ou refuser             —       —      O             —            —        —             —
 le plan (porte 1)                               (sollicité)

 Saisir mesures et                —       O      —             —            —        —             —
 gains proposés

 Valider ou refuser les           —       —      —             O            —        —             —
 gains

 Enregistrer un                   —       O      —             —            —        —             —
 contrôle d'efficacité

 Soumettre la clôture             —       O      —             —            —        —             —
 (T8)

 Approuver la clôture             —       —      —             —            O        —             —
 (T9)

 Mettre en attente,               —       O      —             —            O        —             —
 lever le blocage

 Relancer une action              —       O      —             —            O        O             —
 ou une validation

 Modifier le niveau de            —       O      —             —            —        O             —
 confidentialité

 Commenter                        O       O      O             O            O        —             —


 Opération                        Agent      Pilote Valideur     Contrôle      Direction Admin           Admin
                                                    métier       de gestion              fonctionnel     technique

 Joindre un fichier               O (ses     O       —           —             —          —              —
                                  actions)

 Télécharger une                  O          O       O           O             O          O              —
 pièce jointe, exporter
 le PDF A3

 Consulter l'historique           —          O       —           —             O          O              —
 d'une fiche

 Gérer comptes,                   —          —       —           —             —          O              —
 affectations, unités,
 listes de choix

 Paramètres                       —          —       —           —             —          O              —
 fonctionnels
 (cadence des
 rappels, limites de
 fichiers)

 Paramètres                       —          —       —           —             —          —              O
 techniques (SMTP,
 LDAP), journal
 technique


L'administrateur fonctionnel ne modifie que la désignation du pilote et le niveau de
confidentialité ; il ne commente pas et n'approuve rien à la place d'un autre. Le Contrôle
de gestion n'approuve pas la clôture.


### 2.4 Visibilité des fiches

  Rôle                                  Fiches Normal                              Fiches Restreint

  Agent                                 Celles qu'il a créées ou dont il est       Idem
                                        responsable d'une action

  Pilote                                Celles qu'il pilote, plus celles           Celles qu'il pilote
                                        visibles comme Agent

  Valideur métier                       Fiches de son périmètre dont son           Seulement si sollicité sur la
                                        domaine est concerné                       fiche

  Contrôle de gestion                   Fiches comportant des gains                Seulement si des gains sont
                                                                                   à valider

  Direction                             Toutes                                     Toutes

  Administrateur                        Toutes                                     Consultation (hypothèse à
  fonctionnel                                                                      confirmer)


  Rôle                                   Fiches Normal                           Fiches Restreint

  Administrateur                         Aucune                                  Aucune
  technique


Ces règles s'appliquent à l'identique aux listes, recherches, tableaux de bord,
notifications, historique, pièces jointes, téléchargements et exports. Une fiche non visible
est introuvable (404), pas interdite (403) : son existence n'est pas révélée.


### 2.5 Restrictions obligatoires
     Le pilote ne peut pas approuver sa propre fiche : sa signature est la soumission (B8).
     Un utilisateur qui cumule plusieurs rôles reste soumis à cette règle.
     L'administrateur fonctionnel ne modifie aucune donnée métier, sauf la désignation du
     pilote et la confidentialité, et n'approuve rien à la place d'un autre.
     L'administrateur technique n'a aucun accès au contenu des fiches.
     Le masquage d'un bouton dans l'interface n'est jamais une protection : le serveur
     refuse l'opération.


3. Périmètre et exigences fonctionnelles
La v1 livre un parcours A3 complet sur l'application locale ; ce qui dépend de la SAR est
préparé dans le code et documenté, sans être branché (TRD §17 et §19).


### 3.1 Inclus, préparé, exclu

  Catégorie                             Contenu

  Inclus                                Connexion locale, définition et réinitialisation du
                                        mot de passe par courriel ; comptes, rôles,
                                        affectations, unités, équipements, listes de choix ;
                                        déclaration et fiche en 12 sections avec brouillons ;
                                        désignation du pilote ; workflow et circuit de
                                        validation à deux portes ; actions, MOC, contrôles
                                        d'efficacité J+30/60/90 ; mesures et gains en FCFA
                                        ; pièces jointes et commentaires ; relances
                                        manuelles et automatiques ; notifications internes ;
                                        tableaux de bord par profil ; confidentialité Normal
                                        ou Restreint ; export PDF A3 ; historique immuable ;
                                        données de démonstration ; documentation


  Catégorie                             Contenu

  Préparé, non branché                  LDAP : interface AuthProvider et squelette
                                        désactivé. SAP : champs de référence manuels et
                                        interface SapGateway (implémentation nulle).
                                        SMTP de la SAR : réglage par l'administrateur
                                        technique. Antivirus des fichiers : point d'extension

  Exclu                                 Connexion LDAP réelle ; appels SAP, SNCC et
                                        GMAO ; notifications par courriel ; WebSocket ;
                                        export Excel ; tablette et mobile ; déploiement en
                                        production par le binôme ; analyse antivirus


SAP reste la source de vérité des incidents, ordres et coûts ; l'outil A3 reste maître de la
démarche. L'utilisateur ne saisit que la référence.


### 3.2 Exigences fonctionnelles
Chaque exigence est testée par au moins un scénario de la section 16 (priorités en section
15).


  N°             Exigence                                                       Priorité

  FR-01          L'agent déclare une fiche en une étape ; le numéro             P1
                 A3-AAAA-NNN est attribué à la création

  FR-02          L'administrateur fonctionnel désigne le pilote parmi           P1
                 les titulaires du rôle Pilote de l'unité

  FR-03          Le pilote complète les 12 sections et enregistre des           P1
                 brouillons ; l'état de sauvegarde est visible

  FR-04          Le workflow applique les transitions T1 à T13 et les           P1
                 règles B1 à B8, avec la liste des conditions
                 manquantes en cas de refus

  FR-05          Porte 1 : validation du plan par Production /                  P1
                 Exploitation puis les valideurs des domaines
                 cochés

  FR-06          Les actions portent responsable, échéance, coût,               P1
                 statut, cause liée ; le MOC bloque le démarrage
                 (B1)

  FR-07          Les mesures (Référence, Cible, Actuelle, Après) et             P1
                 les écarts sont calculés par une classe unique


  N°             Exigence                                               Priorité

  FR-08          Trois contrôles J+30, J+60, J+90 sont créés par        P1
                 action réalisée ; un échec impose une action
                 corrective (B4)

  FR-09          Les gains en FCFA sont calculés, validés par le        P1
                 Contrôle de gestion ; les gains non validés restent
                 hors des KPI officiels

  FR-10          Porte 2 : Contrôle de gestion (si gains) puis          P1
                 Direction ; la clôture est enregistrée
                 automatiquement

  FR-11          Notifications internes avec cloche ; compteur au       P1
                 chargement puis toutes les 60 s

  FR-12          Relance manuelle (une par 24 h et par cible)           P1

  FR-13          Historique métier immuable, consultable selon la       P1
                 visibilité

  FR-14          Tableau de bord par profil, registre avec recherche,   P1
                 filtres, tri et pagination

  FR-15          Gestion des comptes, affectations, unités,             P1
                 équipements et listes de choix par l'administrateur
                 fonctionnel

  FR-16          Confidentialité Normal ou Restreint appliquée          P2
                 partout (liste, API, export, notifications)

  FR-17          Pièces jointes (D8) et commentaires généraux ;         P2
                 motifs obligatoires de refus et de blocage

  FR-18          Rappels automatiques tous les 7 jours (actions en      P2
                 retard, validations en attente)

  FR-19          Définition et réinitialisation du mot de passe par     P2
                 courriel ; paramètres SMTP et bouton d'essai

  FR-20          Export PDF A3 paysage des 12 sections, version,        P2
                 contrôles, signatures, confidentialité

  FR-21          Indicateurs complets de la Direction (§10)             P2

  FR-22          Références SAP (équipement, avis, ordre) saisies à     P1
                 la main ; interfaces LDAP et SAP préparées


  N°             Exigence                                                    Priorité

  FR-23          Finitions d'interface, filtres avancés, manuel              P3
                 utilisateur court


4. La fiche A3
La fiche reprend les 12 sections de la fiche papier ; l'agent la crée en quelques champs, le
pilote la complète ensuite.


### 4.1 Déclaration
Champs obligatoires : titre, origine, énoncé du problème, unité. L'équipement est
recommandé quand il est identifié ; la confidentialité vaut Normal par défaut ; le déclarant
et la date sont automatiques ; le statut initial est Ouvert. Le numéro A3-AAAA-NNN (par
exemple A3-2026-001) est remis à zéro chaque année et ne change plus. Le pilote est
désigné ensuite par l'administrateur fonctionnel.


### 4.2 Les 12 sections

  Section                               Contenu                             Exigé

  1. Identification                     N° A3, titre, unité, équipement,    Déclaration : titre, origine,
                                        n° d'avis SAP, n° d'ordre SAP,      unité. Soumission du plan : le
                                        pilote, équipe, sponsor, dates      reste, dont le type
                                        de lancement et cible, type         d'amélioration
                                        d'amélioration, origine
                                        (précision si Autre),
                                        confidentialité, statut

  2. Contexte, enjeu et                 Contexte, énoncé, fréquence         Déclaration : énoncé.
  problème                              (liste), impacts HSE,               Soumission : le reste
                                        production, qualité, énergie et
                                        environnement, sûreté et
                                        cybersécurité, impact financier
                                        estimé

  3. Situation actuelle                 Indicateurs : référence ou cible,   Soumission : au moins
                                        situation actuelle, écart,          l'indicateur principal
                                        source et période


  Section                               Contenu                             Exigé

  4. Objectif                           Objectif SMART, périmètre, KPI      Soumission
                                        principal, KPI à ne pas
                                        dégrader, résultats attendus
                                        (conditions de clôture)

  5. Causes racines                     Méthode (5 Pourquoi, Ishikawa,      Soumission : méthode et au
                                        Pareto, Autre précisée) ;           moins une cause
                                        causes : n°, catégorie, libellé,
                                        niveau, cause racine oui ou
                                        non, preuve

  6. Contre-mesures                     Actions rattachées à une cause      Soumission : au moins une
                                        : responsable, échéance, coût       action liée à une cause
                                        estimé, statut, type

  7. Risques et MOC                     Domaines concernés, risque,         Soumission : domaines
                                        MOC nécessaire (référence,          concernés
                                        statut, preuve de clôture),
                                        mesure de maîtrise,
                                        responsable, validation métier

  8. Résultats après action             KPI avant, après, cible, écart,     T7 : mesure Après du KPI
                                        période de vérification ;           principal et objectif atteint
                                        objectif atteint (Oui,
                                        Partiellement, Non)

  9. Gains économiques                  Production récupérée, énergie       Avant la clôture : gains ou
                                        économisée, maintenance             mention « sans gain chiffré »
                                        évitée, non-qualité évitée,
                                        autres ; total A, coût B, gain
                                        net, payback

  10. Standardisation et                SOP, paramètres, formation,         Avant la clôture
  pérennisation                         plan de maintenance, KPI au
                                        tableau de bord ; l'« audit de
                                        maintien 30/60/90 jours » de la
                                        fiche papier est représenté par
                                        les contrôles d'efficacité (§8.3)

  11. Leçons apprises                   Ce qui a fonctionné ou non,         Avant la clôture
                                        standard à répliquer, retour
                                        d'expérience, projet suivant

  12. Validation                        Fonction, nom, date, décision,      Selon les deux portes
                                        commentaire, version ; date de
                                        clôture


Les sections 3 et 8 partagent les mêmes indicateurs : ils sont saisis une fois sous forme de
mesures de types différents (la mesure Actuelle de la section 3 est la valeur Avant de la
section 8).


### 4.3 Listes de choix
Les listes sont des référentiels administrables ( /listes/{code}/valeurs ), jamais codées
en dur. Une valeur se désactive sans suppression et les libellés historiques sont
conservés. Valeurs initiales reprises de la fiche papier ; la valeur Autre appelle une
précision libre.

     Type d'amélioration : Sécurité/HSE, Fiabilité, Énergie, Rendement, Qualité, Coût,
     Organisation, Intégrité/Sûreté.
     Origine : Audit, Incident/presque-accident, Suggestion terrain, Écart KPI, Inspection,
     Retour d'expérience, Autre.
     Fréquence : ponctuelle, quotidienne, hebdomadaire, mensuelle, récurrente.
     Méthode d'analyse : 5 Pourquoi, Ishikawa, Pareto, Autre.
     Catégorie de cause : Main-d'œuvre, Matière, Matériel, Méthode, Milieu, Mesure,
     Autres.
     Domaines : QHSE, Procédé, Fiabilité, Intégrité, Production / Exploitation, Sûreté /
     Cybersécurité, Autres.
     Types d'action et fréquences de contrôle : valeurs à valider avec l'amélioration continue
     (TRD §18).


### 4.4 Brouillons, pièces jointes, commentaires
     Brouillons : le pilote enregistre une fiche incomplète. L'interface distingue non
     enregistré, en cours, réussi, échec ; le succès n'est affiché qu'après la réponse positive
     du serveur.
     Pièces jointes (D8) : PDF, PNG, JPEG, DOCX, XLSX, PPTX ; 10 Mo par fichier, 20 fichiers
     par fiche, paramétrables ; type réel détecté à l'envoi ; téléchargement uniquement par
     une requête authentifiée soumise aux droits de la fiche.
     Commentaires : généraux sur la fiche, les validations et les actions ; motif obligatoire
     pour tout refus et tout blocage. Chaque commentaire porte auteur, date et contexte.


5. Workflow, statuts et transitions
Le workflow est celui du plan v3 (§6), repris intégralement. Il est implémenté par une
seule machine à états ( FicheWorkflow , TRD §10) : aucun autre code ne modifie le statut.
Chaque transition s'exécute dans une transaction avec verrou de ligne ; si la fiche a


changé de statut entre-temps le serveur répond 409, si une garde n'est pas satisfaite il
répond 422 avec la liste des conditions manquantes.


### 5.1 Étapes et statuts généraux
Les huit étapes détaillènt la vie de la fiche ; les quatre statuts généraux de la fiche papier
(Ouvert, En cours, En attente, Clôturé) servent aux listes et aux tableaux de bord (plan v3
§6.1).


  Étape                                 Signification                                    Statut
                                                                                         général

  Ouvert                                Fiche déclarée, pas encore prise en charge par   Ouvert
                                        un pilote

  En cours                              Pilote désigné ; analyse, causes et plan en      En cours
                                        rédaction

  En validation du plan                 Plan soumis ; porte 1                            En cours

  Réalisation des actions               Plan validé ; actions en exécution               En cours

  Mesure des résultats                  Actions réalisées ; mesure des résultats         En cours

  Vérification du                       Résultat obtenu ; contrôles J+30, J+60, J+90     En cours
  maintien

  En validation de                      Clôture soumise ; porte 2                        En cours
  clôture

  En attente                            Fiche bloquée depuis une étape active, motif     En attente
                                        obligatoire ; reprise à l'étape précédente

  Clôturé                               Clôture approuvée par la Direction               Clôturé


Statuts d'une action : À faire, En cours, Réalisée, Annulée (motif obligatoire), Bloquée
(motif obligatoire, reprise au statut précédent). Une action est en retard quand son
échéance est dépassée et qu'elle n'est ni Réalisée ni Annulée.


### 5.2 Transitions
Le corps de POST /fiches/{id}/transitions porte le code (T3, T7…) et, selon le cas, un
motif ou un commentaire.


  N°         Transition                      Condition                            Acteur

  T1         (début) → Ouvert                Titre, origine, énoncé et unité      Agent
                                             renseignés

  T2         Ouvert → En cours               Pilote désigné par                   Pilote désigné
                                             l'administrateur fonctionnel ;
                                             début de l'analyse

  T3         En cours → En validation du     Soumission : B2 satisfaite           Pilote
             plan

  T4         En validation du plan →         Approbation de Production /          Système
             Réalisation des actions         Exploitation, puis de tous les
                                             autres valideurs sollicités

  T5         En validation du plan → En      Refus d'un valideur ;                Valideur
             cours                           commentaire obligatoire (B6) ;
                                             notification au pilote

  T6         Réalisation des actions →       Toutes les actions sont              Pilote
             Mesure des résultats            Réalisées ou Annulées avec
                                             motif

  T7         Mesure des résultats →          Mesure Après du KPI principal        Pilote
             Vérification du maintien        et des KPI à ne pas dégrader
                                             (B3) ; objectif atteint renseigné
                                             ; si Partiellement, écart et suite
                                             donnée précisés

  T8         Vérification du maintien → En   Contrôles J+30, J+60, J+90           Pilote
             validation de clôture           conformes pour chaque action
                                             non annulée (B4) ; actions de
                                             pérennisation enregistrées ;
                                             gains renseignés ou mention «
                                             sans gain chiffré »

  T9         En validation de clôture →      Approbation du Contrôle de           Contrôle de
             Clôturé                         gestion (si gains), puis de la       gestion, Direction
                                             Direction (B5) ; date de clôture
                                             enregistrée

  T10        En validation de clôture →      Refus ; commentaire                  Contrôle de
             Mesure des résultats ou         obligatoire (B6) ; retour à          gestion, Direction
             Vérification du maintien        l'étape concernée


  N°         Transition                      Condition                        Acteur

  T11        Mesure des résultats ou         Nouvelle boucle : objectif Non   Pilote
             Vérification du maintien → En   atteint, Partiellement avec
             cours                           nouvelle boucle décidée, ou
                                             gain non maintenu ; nouvelle
                                             version de la fiche

  T12        Toute étape active → En         Blocage ; motif obligatoire      Pilote ou Direction
             attente

  T13        En attente → étape              Levée du blocage                 Pilote ou Direction
             précédente


### 5.3 Règles de blocage

  N°         Règle                                                  Appliquée à

  B1         Une action soumise à un MOC ne passe pas à En          Démarrage de l'action
             cours tant que le MOC n'est pas Clôturé, avec
             référence et preuve de clôture

  B2         Pas de soumission du plan sans méthode d'analyse,      T3
             indicateur principal, au moins une cause, au moins
             une action rattachée à une cause, domaines
             concernés, ni sans valideur affecté (unité ou
             global) pour chaque domaine coché : l'application
             indique le rôle manquant

  B3         Pas de passage à la vérification ni de clôture sans    T7, T9
             mesure Après du KPI principal

  B4         Pas de clôture sans contrôles J+30, J+60 et J+90       T8
             conformes pour chaque action non annulée ; un
             contrôle non conforme exige une action corrective
             et sa nouvelle vérification (§8.3)

  B5         Pas de clôture sans approbation de la Direction, et    T9
             du Contrôle de gestion si des gains sont chiffrés

  B6         Tout refus et tout blocage exigent un commentaire      T5, T10, T12

  B7         Un valideur n'agit que sur une validation demandée     Validations
             à l'étape active

  B8         Règle d'identité : le pilote ne valide pas sa propre   T3, validations
             fiche ; sa signature est la soumission


### 5.4 Diagramme des états
Le diagramme d'états du plan v3 (§6.4) reste valable. Les contrôles par action (§8) ne
changent aucun état, seulement la condition de T8.


6. Mesures, gains et formules
Toutes les formules vivent dans la classe Calculs du backend (TRD §13) ; les écrans,
tableaux de bord et l'export PDF appellent la même classe.


### 6.1 Mesures
L'application conserve les valeurs de référence, les cibles et les mesures après action.
Une mesure a un type : Référence, Cible, Actuelle (= Avant) ou Après. Les indicateurs sont
quantitatifs ou qualitatifs ; le sens souhaité (hausse ou baisse) est défini dans l'indicateur.


### 6.2 Formules
Écart entre une valeur mesurée et sa référence (ou sa cible) :

  \text{Écart} = \text{valeur mesurée} - \text{valeur de référence (ou cible)}


Amélioration en pourcentage, avec s = +1 quand une hausse est souhaitée et s = −1 quand
c'est une baisse :

  \text{Amélioration (\%)} = \frac{\text{après} - \text{avant}}{\text{avant}}
  \times 100 \times s


Gain annuel d'une ligne (arrondi à l'entier, FCFA), total des gains A, gain net de première
année et délai de retour :

  \text{gain}_i = \text{quantité}_i \times \text{coût unitaire}_i \qquad A =
  \sum_i \text{gain}_i \qquad \text{Gain net} = A - B \qquad \text{Payback} =
  \frac{B}{A}


B est le coût de mise en œuvre, ponctuel, saisi sur la fiche (la somme des coûts estimés
des actions est proposée par défaut). Le payback est exprimé en années (affichable en
mois) et calculé seulement si A est strictement positif ; un ROI en pourcentage n'est pas
retenu. Quand le dénominateur est nul (valeur avant nulle, A nul), l'affichage est « Non
calculable » et les autres valeurs restent visibles.


### 6.3 Gains
Chaque ligne de gain porte une catégorie (production récupérée, énergie économisée,
maintenance évitée, pertes ou non-qualité évitées, autres), une hypothèse de calcul
obligatoire, une quantité physique, son unité et un coût unitaire en FCFA. Le montant
annuel est calculé par le serveur ; il n'est jamais saisi.

     Montants en FCFA, entiers, sans décimales, avec séparateur de milliers à l'affichage.
     Le pilote saisit ; le Contrôle de gestion valide ou refuse chaque gain. Statuts : proposé,
     validé, refusé.
     Les gains non validés n'entrent jamais dans les indicateurs financiers officiels. Le gain
     net annuel validé additionne les gains nets des fiches dont tous les gains sont validés,
     par année de validation.


     Une fiche sans gain chiffré porte la mention « sans gain chiffré » et n'appelle pas le
     Contrôle de gestion.
     Le coût d'un ordre SAP pourra à terme être affiché à titre d'information, jamais comme
     gain automatique.

Les formules financières restent à valider avec le Contrôle de gestion ; la devise FCFA est
confirmée.


7. Circuit de validation
Deux portes, dans un ordre précis ; le service ValidationCircuit crée et résout les
demandes (TRD §10).


  Porte             Qui valide                        Déclenchement             Mode

  1. Plan           Production / Exploitation,        Soumission du plan        Production / Exploitation
                    puis les autres valideurs         (T3)                      d'abord ; les autres en
                    des domaines cochés                                         parallèle, chacun approuve
                                                                                ou refuse

  2.                Contrôle de gestion (si           Soumission de la          En séquence
  Clôture           gains chiffrés), puis             clôture (T8)
                    Direction


Production / Exploitation est toujours sollicitée en premier. Les autres valideurs se
déduisent des domaines cochés en section 7 de la fiche :


  Domaine coché                         Valideur sollicité

  QHSE                                  Valideur HSE (couvre aussi la composante Qualité)

  Procédé                               Valideur Procédé / Technique

  Fiabilité                             Valideur Maintenance

  Intégrité                             Valideur Inspection / Intégrité

  Production / Exploitation             Valideur Production / Exploitation (en premier)

  Sûreté / Cybersécurité                Valideur Procédé / Technique

  Autres                                Valideur(s) choisi(s) par le pilote parmi les rôles de
                                        valideur existants


Règles
     Chaque valideur approuve ou refuse ; le refus exige un commentaire (B6).
     Après un refus, la fiche revient à l'étape précédente pertinente (T5, T10) avec
     notification. Après correction, seule l'étape concernée est refaite : les signatures
     obtenues sont conservées, sauf si la correction touche le domaine d'un valideur (le
     service conserve l'empreinte de domaine des signatures).
     Chaque validation enregistre le nom du valideur, la date, la décision, le commentaire et
     la version de la fiche.
     Le premier titulaire du rôle dans l'unité de la fiche est sollicité ; à défaut, le titulaire
     d'une affectation globale ; à défaut de l'un et de l'autre, la soumission est refusée (B2).
     Le valideur n'agit que sur une demande à l'étape active (B7) et ne valide pas une fiche
     dont il est le pilote (B8).
     La clôture n'est possible qu'après approbation de la Direction ; elle est alors
     enregistrée automatiquement (T9).
     Aucun délai de réponse ni suppléance automatique : l'ancienneté de chaque demande
     est affichée et un utilisateur habilité relance le valideur (section 9).


8. Actions, MOC et contrôles d'efficacité

### 8.1 Actions
Chaque action est rattachée à la fiche et à une cause identifiée ; elle porte description,
type, responsable, échéance, coût estimé, statut, commentaires et justificatifs. Les
actions en retard apparaissent dans les vues autorisées et déclenchent des rappels.


### 8.2 MOC
Quand une action nécessite une gestion du changement, le backend vérifie la référence,
le statut et la preuve de clôture du MOC avant d'autoriser le passage à En cours (B1). La
fiche papier le rappelle : toute modification touchant le procédé, les équipements, les
protections, les procédures ou les conditions opératoires suit le processus de gestion du
changement et les exigences HSE et intégrité du site.


### 8.3 Contrôles J+30, J+60 et J+90
Les contrôles sont rattachés à chaque action (D1), pas à la fiche : le plan v3 les modélisait
comme des mesures de type audit de maintien, le modèle v2 ajoute la classe Contrôle
d'efficacité (table controles ). ControleEfficaciteService applique B4.

 1. Quand une action passe à Réalisée, trois contrôles sont créés, à 30, 60 et 90 jours
     calendaires de sa date de réalisation.


 2. Chaque contrôle enregistre l'action, la date de référence, l'échéance ( date_echeance ),
     la date effective, le résultat (conforme ou non conforme), un commentaire ou une
     preuve et le contrôleur.
 3. Un contrôle devient disponible à son échéance et notifie le pilote ; le pilote enregistre
     le résultat ( PATCH /controles/{id} ).
 4. Les trois contrôles de chaque action non annulée sont obligatoires avant la clôture (B4,
     T8).


### 8.4 Échec d'un contrôle (D2)
Un résultat non conforme impose une action corrective rattachée à la même cause, puis
une nouvelle vérification avant la clôture ; la fiche reste à Vérification du maintien.
Hypothèse retenue : une seule vérification, à 30 jours de la réalisation de l'action
corrective ; la règle est à valider avec le métier. La boucle T11 reste valable à l'échelle de la
fiche : objectif Non atteint, Partiellement avec nouvelle boucle décidée, ou gain non
maintenu renvoient la fiche à En cours avec une nouvelle version.


### 8.5 Conséquences
Une fiche ne peut pas être clôturée moins de 90 jours après la réalisation de sa dernière
action, et le délai moyen de clôture en tient compte. Pour la démonstration, la base
contient des actions réalisées dans le passé dont les contrôles sont déjà disponibles
( DemoSeeder ).


9. Relances et notifications

  Sujet                                 Règle

  Canal                                 Notifications internes. Le courriel n'est utilisé que
                                        pour le mot de passe (section 13)

  Événements                            Affectation du pilote ; soumission du plan ;
                                        demande de validation ; approbation ou refus ;
                                        mise en attente et levée ; création ou réaffectation
                                        d'une action ; échéance proche ou dépassée ;
                                        contrôle d'efficacité disponible ; demande de
                                        validation de clôture ; relance

  Destinataires                         Déterminés par rôle, affectation, permissions et
                                        événement ; jamais d'information d'une fiche
                                        Restreint pour un utilisateur non autorisé


  Sujet                                 Règle

  Relance manuelle                      Bouton Relancer sur une action en retard ou une
                                        validation en attente ( POST /relances ). Autorisés
                                        : pilote, Direction, administrateur fonctionnel. Une
                                        notification pour le destinataire et une ligne
                                        d'historique

  Limite                                Au plus une relance par 24 heures et par cible
                                        (action ou validation) ; au-delà, réponse 429

  Rappels automatiques                  Commande a3:relances exécutée une fois par
                                        jour par le planificateur ; elle rappelle tous les 7
                                        jours (paramètre modifiable par l'administrateur
                                        fonctionnel) tant qu'une action est en retard ou
                                        qu'une validation est en attente. Destinataire :
                                        responsable de l'action avec copie au pilote, ou
                                        valideur concerné. Auteur : Système

  Idempotence                           Une contrainte d'unicité (cible, jour) et la règle des
## 24 heures empêchent les doublons

  Arrêt                                 Les rappels cessent quand l'élément est résolu ou
                                        que le destinataire perd son droit d'accès

  Délai des valideurs                   Aucun délai ni suppléance automatique ;
                                        ancienneté affichée

  Rafraîchissement                      GET /notifications/non-lues au chargement
                                        puis toutes les 60 secondes ; pas de WebSocket ;
                                        retard possible de 60 secondes

  Contenu                               Message, date, lu ou non lu ( lu_le ) ; cloche dans
                                        l'en-tête ; marquage lu par POST
                                        /notifications/{id}/lu


10. Tableaux de bord, recherche et export

### 10.1 Indicateurs
Calculés côté serveur ( GET /tableau-de-bord , GET /kpi ) et filtrés par la visibilité de la
section 2.4.


  Indicateur                                           Définition

  Fiches ouvertes                                      Fiches dont le statut n'est pas Clôturé, détail
                                                       par statut

  Taux de clôture                                      Parmi les fiches créées sur la période, part des
                                                       fiches clôturées

  Délai moyen de clôture                               Moyenne de (date de clôture − date de
                                                       déclaration) des fiches clôturées sur la période,
                                                       en jours

  Part des fiches avec vérification                    Parmi les fiches arrivées à la Mesure des
  d'efficacité                                         résultats ou au-delà, part dont toutes les
                                                       actions réalisées ont leurs contrôles renseignés

  Gain net annuel validé                               Somme des gains nets (A − B) des fiches dont
                                                       tous les gains sont validés, par année de
                                                       validation, en FCFA

  Actions en retard                                    Échéance dépassée, ni Réalisée ni Annulée

  Validations en attente                               Demandes non traitées, avec leur ancienneté


Le délai moyen part de la déclaration (hypothèse du plan v3, point 13.5).


### 10.2 Tableau de bord par profil

  Profil                                Contenu

  Agent                                 Mes fiches par statut ; mes actions à faire et en
                                        retard

  Pilote                                Mes fiches par statut ; actions en retard ;
                                        validations en attente avec ancienneté ; échéances
                                        à venir ; contrôles disponibles

  Valideur métier                       Fiches à valider avec ancienneté ; décisions
                                        récentes

  Contrôle de gestion                   Gains à valider ; gains validés de l'année ; gain net
                                        annuel validé

  Direction                             Indicateurs P13 ; répartition par unité, type
                                        d'amélioration et origine ; fiches et actions en
                                        retard ; validations en attente


  Profil                                Contenu

  Administrateur fonctionnel            Vue globale ; affectations ; fiches sans pilote ; listes
                                        de choix ; relances à effectuer

  Administrateur technique              Nombre de comptes ; état de l'authentification et
                                        du courriel ; événements techniques


### 10.3 Registre et recherche
La liste des fiches propose recherche, filtres (statut, type d'amélioration, unité, pilote,
origine, dates, équipement, confidentialité), tri, pagination serveur ( page , per_page , 100
au maximum) et accès au détail. Filtres et tris sont limités à une liste blanche.


### 10.4 Export PDF A3
Toute fiche visible peut être exportée en PDF A3 paysage ( GET
/fiches/{id}/export.pdf ) : 12 sections, numéro de version, contrôles, signatures de
validation (nom, date, décision) et confidentialité. L'export suit les droits de la
consultation ; les pièces jointes restent séparées. Pas d'export Excel. La bibliothèque
(Dompdf recommandé) est à confirmer (TRD §18).


11. Interface et charte graphique
Le template Elegent est adapté entièrement : on garde la mise en page (barre latérale, en-
tête, tableaux, formulaires), on supprime les pages inutiles dont le multilingue,
l'apparence suit la charte SAR (TRD §4).


### 11.1 Charte
     Couleurs : celles de colors.css , transposées dans le thème Material UI. Rouge SAR
     #E60012 réservé aux boutons principaux, liens et accents (survol #B8000E, clic
     #8F000B) ; fond de page gris très clair ; texte encre ; messages succès, erreur,
     avertissement, information avec fonds et bordures ; couleurs par statut de fiche ( --
     st-* ), par statut d'action ( --action-* ) et par confidentialité ( --conf-* , Restreint en
     pastille sombre à texte blanc) ; séries de graphiques --chart-1 à --chart-7 .
     Logo : ovale rouge « sar », dans la barre latérale et sur la page de connexion, sans
     déformation.
     Poste : PC uniquement, largeur minimale 1280 px, thème clair, interface en français.
     Accessibilité : contrastes suffisants, anneau de focus clavier ( --focus-ring ),
     navigation cohérente.


### 11.2 Écrans et comportements
     Connexion, mot de passe oublié, réinitialisation ; tableau de bord ; registre des fiches ;
     fiche en 12 sections par étapes avec progression ; validations à traiter ; notifications ;
     administration ; état technique du TNI.
     En-tête : utilisateur, profil actif avec sélecteur, cloche de notifications.
     Formulaires : erreurs 422 affichées près des champs ; état de sauvegarde visible ;
     ancienneté des demandes de validation affichée.
     Session : réponse 401 renvoie à la connexion ; avertissement 2 minutes avant
     l'expiration des 30 minutes d'inactivité.
     Pièces jointes et PDF : téléchargement par requête authentifiée, aucune URL publique.


### 11.3 Routes et menus par profil
L'interface adapte son menu au profil actif, mais le serveur reste seul juge des droits.


  Route                                   Contenu                         Profils

   /connexion , /mot-de-passe-            Connexion et mot de passe       Public
  oublie ,
   /reinitialisation/:jeton

   /tableau-de-bord                       Tableau de bord du profil       Tous sauf TNI (le TNI
                                          actif                           voit son état
                                                                          technique)

   /fiches                                Registre, recherche, filtres    Agent, Pilote,
                                                                          Valideurs, Contrôle de
                                                                          gestion, Direction,
                                                                          Admin fonctionnel

   /fiches/nouvelle                       Déclaration                     Agent, Pilote

   /fiches/:id                            Fiche en 12 sections,           Selon visibilité (§2.4)
                                          actions, contrôles, gains,
                                          pièces jointes,
                                          commentaires, historique

   /validations                           Demandes à traiter avec         Valideurs métier,
                                          ancienneté                      Contrôle de gestion,
                                                                          Direction

   /notifications                         Liste des notifications         Tous sauf TNI


  Route                                         Contenu                          Profils

   /admin/utilisateurs ,                        Administration métier            Admin fonctionnel
   /admin/affectations ,
   /admin/unites ,
   /admin/equipements ,
   /admin/listes ,
   /admin/parametres-
  fonctionnels

   /technique                                   État de l'authentification,      Admin technique
                                                SMTP avec bouton d'essai,
                                                journal technique


12. Modèle de données
Ce modèle est la référence du TRD §6 (conventions : noms en français sans accents,
snake_case, clés bigint , montants FCFA bigint , statuts par enum PHP et contrainte
CHECK, aucune suppression physique des données tracées). Toutes les tables portent
 id , created_at , updated_at ; actif remplace la suppression.


### 12.1 Tables et colonnes

  Table                                 Colonnes principales                  Remarques

   users                                identifiant (unique), email           Compte ldap sans mot
                                        (unique), nom, prenom,                de passe
                                        mot_de_passe (nul si LDAP),
                                        auth_source (local ou ldap),
                                        ldap_dn, actif,
                                        derniere_connexion

   roles                                code, libelle                         Agent, Pilote, Valideur
                                                                              (par domaine), Contrôle
                                                                              de gestion, Direction,
                                                                              Admin fonctionnel, Admin
                                                                              technique

   unites                               code, libelle, actif                  Administrable

   affectations                         user_id, role_id, unite_id (nul =     Porte les droits (§2.2)
                                        global), date_debut, date_fin,
                                        actif


  Table                                 Colonnes principales                Remarques

   equipements                          unite_id, code, libelle,
                                        reference_sap, actif

   references_sap                       fiche_id, equipement_id,            Lecture seule à terme,
                                        numero_avis, numero_ordre,          alimentée par la SAR
                                        libelle, statut, cout

   listes et                            liste : code ; valeur : liste_id,   Types, origines,
   valeurs_listes                       code, libelle, ordre, actif         fréquences, méthodes,
                                                                            catégories, domaines,
                                                                            types d'action

   fiches_a3                            numero_a3 (unique), version,        statut_etape modifié
                                        titre, unite_id, equipement_id,     par FicheWorkflow seul
                                        declarant_id, pilote_id, sponsor,
                                        equipe, type_amelioration,
                                        origine, origine_precision,
                                        frequence, date_lancement,
                                        date_cible, statut_etape,
                                        statut_general, confidentialite,
                                        cout_mise_en_oeuvre_b,
                                        sans_gain_chiffre,
                                        objectif_atteint, date_cloture

   compteurs_fiches                     annee, derniere_valeur              Numérotation A3-AAAA-
                                                                            NNN, ligne verrouillée à la
                                                                            création

   fiche_domaines                       fiche_id, domaine,                  Domaines concernés
                                        valideur_role_id

   impacts                              fiche_id, type (HSE, production,    Section 2
                                        qualité, énergie, sûreté,
                                        financier), description

   indicateurs                          fiche_id, libelle, unite_mesure,    Sections 3 et 8
                                        sens (hausse ou baisse),
                                        principal, a_ne_pas_degrader,
                                        source, periode

   mesures                              indicateur_id, type (reference,     « Audit de maintien »
                                        cible, actuelle, apres), valeur,    supprimé
                                        date_mesure,
                                        periode_verification


  Table                                 Colonnes principales                  Remarques

   causes                               fiche_id, numero, methode,
                                        categorie, libelle, niveau, racine,
                                        preuve

   actions                              fiche_id, cause_id,                   Action corrective :
                                        action_origine_id, description,       action_origine_id
                                        type_action, responsable_id,          renseigné
                                        echeance, cout_estime, statut,
                                        motif_statut, date_realisation,
                                        risque_id

   risques                              fiche_id, domaine, description,       MOC (B1)
                                        moc_requis, moc_reference,
                                        moc_statut, moc_preuve,
                                        mesure_maitrise,
                                        responsable_id

   gains                                fiche_id, categorie,                  montant_annuel calculé
                                        hypothese_calcul, quantite,
                                        unite, cout_unitaire,
                                        montant_annuel, statut
                                        (propose, valide, refuse),
                                        valide_par_id, date_validation

   perennisation                        fiche_id, type, responsable_id,       Section 10
                                        date, statut, preuve

   lecons                               fiche_id, rubrique, texte             Section 11

   controles                            action_id, jalon (J30, J60, J90,      Nouvelle classe Contrôle
                                        correctif), date_reference,           d'efficacité
                                        date_echeance, date_effective,
                                        resultat (conforme,
                                        non_conforme), commentaire,
                                        preuve, controleur_id,
                                        action_corrective_id

   validations                          fiche_id, porte (1 ou 2), role_id,
                                        valideur_id, decision,
                                        commentaire, version_fiche,
                                        empreinte_domaine,
                                        demandee_le, decidee_le, ordre

   commentaires                         fiche_id, auteur_id, contexte,
                                        objet_id, texte


  Table                                 Colonnes principales               Remarques

   pieces_jointes                       fiche_id, objet_type, objet_id,    Disque privé
                                        nom_origine, nom_stockage
                                        (UUID), type_mime, taille,
                                        empreinte, auteur_id

   evenements_historique                fiche_id, auteur_id (nul =         Immuable : déclencheur
                                        Système), type, champ,             PostgreSQL refusant
                                        ancienne_valeur,                   UPDATE et DELETE
                                        nouvelle_valeur, commentaire,
                                        version_fiche, created_at

   notifications                        user_id, fiche_id, type,           Index sur lu_le
                                        message, cible_type, cible_id,
                                        lu_le

   relances                             cible_type, cible_id, auteur_id    Unique (cible, jour)
                                        (nul = Système),
                                        destinataire_id, jour, mode
                                        (manuelle, automatique)

   parametres                           cle, valeur (chiffrée si secret)   Cadence 7 jours, limites
                                                                           de fichiers, SMTP

   journal_administration               auteur_id, operation, objet,       Journal technique,
                                        detail                             distinct de l'historique
                                                                           métier

   jetons_reinitialisation              user_id, jeton_hache, expire_le,   Valable 60 minutes, usage
                                        utilise_le                         unique


### 12.2 Classes du diagramme v2
Par rapport au diagramme du plan v3 : classes ajoutées Contrôle d'efficacité, Pièce jointe,
Commentaire, Paramètre, Compteur de fiches, Référence SAP, Relance, Jeton de
réinitialisation ; Mesure limitée aux types Référence, Cible, Actuelle, Après ; Action
étendue (statut Bloquée, lien vers le MOC, vers l'action d'origine) ; Gain étendu (quantité,
unité, coût unitaire, montant calculé, statut) ; Fiche A3 étendue (numéro, version, sponsor,
confidentialité) ; Utilisateur étendu (source d'authentification, mot de passe optionnel).


13. Authentification, comptes et points d'extension
Le détail technique est dans le TRD §8, §9 et §17 ; voici les exigences fonctionnelles.


### 13.1 Connexion et comptes
     Connexion locale par identifiant et mot de passe, seul mode actif en v1 (D3). Session de
## 30 minutes d'inactivité, avec message clair à l'expiration.
     Limitation des tentatives : 5 échecs en 15 minutes par identifiant et par adresse ; le
     message d'échec est le même pour un identifiant inconnu et un mot de passe faux.
     Pas d'inscription libre : l'administrateur fonctionnel crée les comptes métier et leurs
     affectations. Le nouveau compte reçoit un lien pour définir son mot de passe.
     Politique de mot de passe : 10 caractères minimum recommandés (à confirmer avec la
     SAR).


### 13.2 Mot de passe oublié et courriel
C'est le seul courriel de l'application (D4). La demande renvoie la même réponse que le
compte existe ou non ; jeton à usage unique valable 60 minutes ; au plus 3 demandes par
heure et par adresse ; refus pour les comptes ldap . L'administrateur technique saisit les
paramètres SMTP (hôte, port, chiffrement, utilisateur, mot de passe, expéditeur) et
dispose d'un bouton d'envoi de test. En démonstration, le transport log écrit le lien dans
le journal technique.


### 13.3 Points d'extension laissés à la SAR

  Point                           Livré                                À faire par la SAR

  LDAP                            Interface AuthProvider ,             Choisir la bibliothèque, renseigner
                                   LocalAuthProvider actif,            serveur, base, compte de liaison,
                                   LdapAuthProvider squelette          attribut, filtre ; activer
                                  commenté ; auth_source et             AUTH_PROVIDER=ldap ; créer les
                                   ldap_dn en base                     comptes ldap . Les rôles et
                                                                       affectations restent inchangés

  SAP                             Interface SapGateway                 Écrire la classe qui appelle l'API
                                  ( findEquipement , findAvis ,        SAP ; activer SAP_ENABLED=true .
                                   findOrdre , lecture seule),         Données à récupérer (hypothèse)
                                   NullSapGateway actif,               : libellé de l'équipement, statut de
                                   FakeSapGateway pour les tests ;     l'avis ou de l'ordre, coût de l'ordre
                                  champs de référence manuels

  Courriel de                     Laravel Mail, transport log , SMTP   Fournir le serveur SMTP
  production                      réglable

  Antivirus                       Contrôle de type et de taille dans   Ajouter l'analyse antivirus
                                   PieceJointeService


  Point                           Livré                             À faire par la SAR

  Déploiement                     README d'installation classique   Serveur, Docker éventuel,
                                                                    sauvegardes et restauration


### 13.4 Qui fait quoi
L'administrateur fonctionnel gère les comptes métier, rôles, affectations ; l'administrateur
technique gère les paramètres techniques (SMTP, LDAP) sans voir le contenu des fiches.


14. Historique et traçabilité
L'historique métier ( evenements_historique ) est écrit par le serveur ; aucun utilisateur,
administrateur fonctionnel compris, ne peut le modifier ou le supprimer, et la base elle-
même refuse UPDATE et DELETE (déclencheur). Il est distinct des journaux techniques.

On y trouve : les changements de champs importants avec ancienne et nouvelle valeur (à
chaque enregistrement explicite du pilote), les changements de statut (création
comprise), les approbations et refus avec leur commentaire, les mises en attente et
reprises, les changements de confidentialité, la désignation du pilote, les relances
manuelles et automatiques (auteur Système) et les commentaires de validation, refus et
blocage.

Chaque ligne indique la fiche, l'auteur, la date et l'heure et la version. Consultation par le
pilote, la Direction et l'administrateur fonctionnel, dans la limite de la visibilité ( GET
/fiches/{id}/historique ). Les opérations sensibles (connexions échouées,
changements de rôles, d'affectations, de listes, de paramètres et de comptes) vont dans
le journal d'administration technique.


15. Priorités et calendrier
Le délai réel (14 jours ouvrés pour deux développeurs) impose de livrer d'abord un
parcours complet minimal. Le modèle de données et l'API couvrent tout dès le début ;
seules les interfaces et les règles détaillées sont ordonnées. Le plan d'implémentation
place ces lots dans le calendrier du 13 au 30 octobre.


  Priorité                              Contenu (exigences FR)                       Jalon

  P1 — parcours minimal                 Authentification locale, rôles,              Vendredi 23 octobre
  complet                               affectations, référentiels, pilote (FR-
                                        02, FR-15) ; déclaration et registre (FR-
                                        01, FR-14) ; fiche en 12 sections et
                                        brouillons (FR-03) ; workflow T1 à T13,
                                        historique (FR-04, FR-13) ; porte 1 (FR-
                                        05) ; actions et MOC (FR-06) ;
                                        mesures (FR-07) ; contrôles (FR-08) ;
                                        gains (FR-09) ; porte 2 et clôture (FR-
                                        10) ; notifications (FR-11) ; relance
                                        manuelle (FR-12) ; références SAP et
                                        interfaces (FR-22)

  P2 — prévu                            Restreint (FR-16) ; pièces jointes et        Mercredi 28 octobre (gel
                                        commentaires (FR-17) ; rappels de 7          du code)
                                        jours (FR-18) ; réinitialisation du mot
                                        de passe et SMTP (FR-19) ; export PDF
                                        A3 (FR-20) ; indicateurs de la
                                        Direction (FR-21)

  P3 — si le temps le                   Finitions, filtres avancés, manuel           Jeudi 29 octobre
  permet                                court (FR-23)


Ordre de renoncement en cas de retard : voir le plan d'implémentation. La démonstration
est supposée le vendredi 30 octobre (à confirmer).


16. Scénarios d'acceptation
Ces scénarios servent de recette (TRD §16) ; P13 est prêt pour la démo quand tous sont
vérifiés et qu'aucun défaut bloquant ne subsiste.


  N°         Scénario                                                        Exigences

  A1         Un agent crée une déclaration et reçoit un numéro               FR-01
             A3-AAAA-NNN ; le compteur repart à 001 l'année
             suivante

  A2         L'administrateur fonctionnel crée un compte, des                FR-02, FR-15
             affectations et désigne un pilote de l'unité


  N°         Scénario                                                 Exigences

  A3         Un utilisateur définit son mot de passe par le lien lu   FR-19
             dans le journal ; la session expire après 30 minutes
             d'inactivité avec avertissement à 2 minutes ; 5
             échecs en 15 minutes bloquent la connexion

  A4         Le pilote complète les 12 sections et enregistre un      FR-03
             brouillon ; l'état de sauvegarde est exact

  A5         La soumission du plan est refusée avec la liste des      FR-04
             manques (B2), y compris un domaine sans valideur
             affecté

  A6         Les valideurs approuvent ou refusent ; un refus          FR-05
             exige un commentaire et ramène la fiche à En cours
             ; Production / Exploitation passe en premier

  A7         Le pilote ne peut pas approuver sa propre fiche          FR-04
             (B8)

  A8         Une action sous MOC ne démarre pas sans MOC              FR-06
             clôturé et preuve (B1)

  A9         Les mesures Après sont conservées ; « Non                FR-07
             calculable » s'affiche quand la référence est nulle

  A10        Trois contrôles sont créés par action réalisée ; un      FR-08
             échec bloque la clôture jusqu'à l'action corrective
             et la nouvelle vérification

  A11        Les gains en FCFA sont calculés, validés par le          FR-09
             Contrôle de gestion ; les gains non validés restent
             hors des KPI officiels

  A12        La Direction clôture après le Contrôle de gestion ;      FR-10
             la date de clôture est enregistrée

  A13        La mise en attente et la reprise exigent un motif et     FR-04
             reprennent à l'étape précédente

  A14        Deux transitions simultanées sur la même fiche : la      FR-04
             seconde reçoit 409

  A15        La relance manuelle est limitée à une par 24 h et        FR-12, FR-18
             par cible ; la commande a3:relances ne crée pas
             de doublon

  A16        Le compteur de notifications se met à jour dans la       FR-11
             minute sans recharger la page


  N°         Scénario                                                     Exigences

  A17        L'historique est immuable, y compris par requête             FR-13
             directe sur la base

  A18        Une fiche Restreint est introuvable (404) dans               FR-16
             l'interface, l'API, les exports, les notifications et le
             tableau de bord pour un utilisateur non autorisé

  A19        L'administrateur fonctionnel change la                       FR-16
             confidentialité mais ne modifie aucun contenu ; le
             TNI n'accède à aucun contenu de fiche

  A20        Une pièce jointe de type interdit, trop lourde ou en         FR-17
             surnombre est refusée ; le téléchargement exige
             l'autorisation

  A21        L'export PDF A3 respecte les droits d'accès et               FR-20
             reprend 12 sections, version, contrôles et
             signatures

  A22        Le tableau de bord de chaque profil n'affiche que            FR-14, FR-21
             des données autorisées

  A23        Les tests Pest couvrent chaque règle T et B, la              tous
             matrice des permissions, la visibilité et Calculs


17. Points ouverts
Ces points ne sont pas inventés par l'équipe : l'hypothèse indiquée s'applique en
attendant la confirmation. Les points techniques sont dans le TRD §18.


  Sujet                                         Hypothèse retenue                        À confirmer avec

  Date de la démo                               Vendredi 30 octobre 2026                 Encadrant de
                                                                                         stage

  Règle de re-vérification après                Action corrective puis une               Amélioration
  échec (D2)                                    vérification à 30 jours                  continue

  Formules de gains (§6.2)                      A − B, payback = B ÷ A,                  Contrôle de
                                                hypothèse obligatoire                    gestion

  Types d'action et fréquences de               Liste à fournir                          Amélioration
  contrôle                                                                               continue


  Sujet                                             Hypothèse retenue                     À confirmer avec

  Administrateur fonctionnel et                     Consultation, pas de                  SAR
  fiches Restreint                                  modification

  Qui peut déclarer une fiche                       Agent et Pilote                       Amélioration
                                                                                          continue

  Politique de mot de passe                         10 caractères minimum                 SAR

  Valideur également déclarant                      Autorisé ; seul le pilote ne valide   SAR
                                                    pas sa fiche

  Sponsor                                           Relève de la Direction (plan v3,      Amélioration
                                                    point 13.2)                           continue

  HSE sollicité                                     Seulement si QHSE est coché           Amélioration
                                                    (plan v3, point 13.3)                 continue

  Domaine « Autres »                                Valideur choisi par le pilote (plan   Amélioration
                                                    v3, point 13.9)                       continue

  Données SAP à récupérer                           Libellé, statut de l'avis ou de       SAR
                                                    l'ordre, coût de l'ordre

  Hébergement, sauvegardes,                         Voir TRD §18                          SAR
  versions PHP, Node, PostgreSQL,
  domaine Sanctum, bibliothèque
  PDF


Annexe A. Cas d'utilisation
Le diagramme du plan v3 (§11) reste la base ; voici l'état v2.


  Acteur                                Cas d'utilisation                    Évolution

  Tous                                  S'authentifier (connexion            Modifié : LDAP devient un
                                        locale)                              point d'extension

  Tous                                  Demander la réinitialisation du      Nouveau
                                        mot de passe par courriel

  Tous                                  Commenter ; joindre et               Nouveau
                                        télécharger une pièce jointe


  Acteur                                Cas d'utilisation                   Évolution

  Tous                                  Changer de profil, consulter        Inchangé (export Excel
                                        tableau de bord, notifications,     absent)
                                        registre, historique ; exporter
                                        en PDF A3

  Agent                                 Déclarer une fiche ; mettre à       Inchangé
                                        jour une action dont il est
                                        responsable

  Pilote                                Compléter la fiche, soumettre       Inchangé
                                        plan et clôture, relancer, mettre
                                        en attente ou lever

  Pilote                                Enregistrer un contrôle             Nouveau
                                        d'efficacité J+30/60/90 ;
                                        enregistrer l'action corrective
                                        après un échec

  Pilote, administrateur                Modifier le niveau de               Inchangé pour le pilote,
  fonctionnel                           confidentialité                     nouveau pour l'administrateur

  Valideur métier                       Approuver ou refuser le plan ;      Inchangé
                                        motiver un refus

  Contrôle de gestion                   Valider les gains chiffrés          Inchangé

  Direction                             Approuver la clôture ; vue          Inchangé
                                        globale ; relancer ; mettre en
                                        attente

  Administrateur                        Créer un compte ; gérer rôles,      Création de compte nouvelle
  fonctionnel                           affectations, unités, listes ;
                                        désigner le pilote ; régler la
                                        cadence des rappels

  Administrateur                        Configurer le SMTP ;                Nouveau pour le SMTP ; LDAP
  technique                             paramètres techniques ; état de     par configuration, sans écran
                                        l'authentification

  Système                               Rappels automatiques de 7           Contrôles nouveaux
                                        jours ; création des contrôles
                                        J+30/60/90 ; avancement T4 ;
                                        notifications et historique


Annexe B. Écarts entre documents et résolution

  Sujet                                 Ce que disaient les documents     Résolution v2

  Authentification                      Plan v3 : LDAP par défaut ; PRD   Connexion locale, point
                                        et TRD v1 : LDAP exclu            d'extension LDAP (§13)

  Courriel                              Absent du TRD v1                  Mot de passe seulement ; SMTP
                                                                          par l'administrateur technique ;
                                                                          log en démo (§13.2)

  Session                               30 minutes dans PRD et TRD        30 minutes, avertissement à 2
                                                                          minutes

  Relances                              Plan v3 : 7 jours et manuelle ;   Commande quotidienne
                                        PRD et TRD v1 : quotidiennes,     idempotente, rappel tous les 7
                                        sans manuelle                     jours, manuelle conservée (§9)

  Rafraîchissement                      PRD v1 : temps réel ; TRD v1 :    Interrogation toutes les 60 s
                                        aucun

  Base de données                       Plan d'implémentation et TRD v1   PostgreSQL partout
                                        : MySQL

  Vocabulaire                           Production / Opérations ;         Production / Exploitation ;
                                        confidentiel                      Restreint

  Modèle et                             TRD v1 : « à définir »            Définis aux §2.3, §2.4 et §12
  permissions

  Administrateur                        PRD et TRD v1 : aucune            Confidentialité et pilote
  fonctionnel                           modification ; plan v3 :          seulement (§2.5)
                                        confidentialité

  Comptes                               Plan v3 : TNI ; PRD v1 : admin    Admin fonctionnel pour le
                                        fonctionnel                       métier, TNI pour la technique

  Statuts                               Correspondance renvoyée à         Reprise du plan v3 §6.1 (§5.1)
                                        plus tard

  Contrôles                             Par action ou par fiche sans      Par action, classe controles ,
  J+30/60/90                            classe                            T11 conservée (§8)

  Périmètre élargi                      Pièces jointes, commentaires,     Intégrés ; Excel exclu
                                        Pareto hors plan v3

  Exigences perdues                     Équipement, SAP, origine,         Réintégrés (§4, §2.4)
                                        sponsor, Restreint


  Sujet                                 Ce que disaient les documents         Résolution v2

  Pièces jointes                        PRD v1.1 : 10 fichiers, TRD v2 : 20   10 Mo et 20 fichiers (D8)

  Règles de blocage                     PRD v1.1 : B1 à B9                    B1 à B8 comme le TRD v2 ;
                                                                              l'ancienne B9 est intégrée à B2

  Numérotation du                       PRD v1.1 §11 et §12 (routes,          v2 : §2.3, 2.4, 5, 6.2, 7, 8.3, 11.3,
  PRD                                   modèle)                               12, 16, D2, D8 cités par le TRD v2

---

## Avenant du 23 octobre 2026 — circuit pilote, chef choisi et sponsor

Cet avenant fixe les décisions prises après la livraison. Il l'emporte sur les paragraphes ci-dessus qui le contredisent, et décrit l'application telle qu'elle fonctionne.

**Déclaration et pilote.**
- Seuls un agent ou un pilote déclarent une fiche.
- Un pilote qui déclare une fiche de son unité peut la piloter lui-même.
- Sinon, les administrateurs fonctionnels sont notifiés, et l'un d'eux désigne un pilote de l'unité de la fiche.
- Le déclarant ne remplit pas la fiche : c'est le pilote qui la rédige.

**Sections 1 à 4 et porte 0 (pertinence).**
- Le pilote remplit les sections 1 à 4.
- En section 1, il choisit le sponsor parmi tous les utilisateurs qui ont un rôle de directeur (Direction et directeurs des domaines). Le champ « Pilote » et les « participants sans compte » sont retirés de cette section.
- En fin de section 4, il choisit le chef de département qui valide la pertinence. L'organigramme propose par défaut le chef du département du pilote.
- Le chef choisi décide de trois façons :
  - **valider** : la fiche passe en cours ;
  - **à refaire** : la fiche revient au pilote avec un commentaire obligatoire ;
  - **classer sans suite** : avec un motif obligatoire.
- Après la validation, les sections 2 à 4 sont figées ; la section 1 reste modifiable.

**Équipe.**
- Après la pertinence, le pilote constitue l'équipe, uniquement avec des agents et des pilotes actifs, même d'une autre unité.
- Les membres voient la fiche et renseignent les sections 5 à 11.
- Ils ne valident jamais la fiche, à aucune porte (B8 étendue).
- Le sponsor et le chef choisis ne peuvent pas être membres.

**Section 7 et porte 1.**
- La section 7 (domaines, risques et MOC) reste dans la fiche.
- Les directeurs des domaines cochés sont notifiés en même temps et doivent tous approuver.

**Gains (section 9).**
- Le montant annuel de chaque ligne est saisi à la main, en FCFA, avec sa nature et son hypothèse.
- L'application ne calcule plus aucun gain : ni quantité × coût unitaire, ni gain net, ni délai de retour.
- Le coût de mise en œuvre devient facultatif.

**Porte 2.**
- Le Contrôle de gestion intervient si des gains sont chiffrés.
- Ensuite, le directeur choisi comme sponsor en section 1 valide la clôture ou renvoie la fiche.

**Preuves.**
- La preuve d'une action réalisée ou d'une action de pérennisation est facultative.
- Le pilote ou un membre peut y joindre, s'il le souhaite, un document ou une photo.

**Connexion.**
- La limite reste à 5 échecs par identifiant.
- Le seuil par adresse IP passe à 50 échecs en 15 minutes, pour ne pas bloquer tout un site derrière un même proxy.

**Écarts avec le texte initial, désormais acceptés.**

| Sujet | Texte initial | Application |
|---|---|---|
| Portes de validation | Deux portes (plan, clôture) | Trois portes : pertinence (0), plan (1), clôture (2) |
| Ordre de la porte 1 | Production d'abord, puis les domaines | Tous les directeurs concernés en même temps |
| Valideur final | Rôle Direction | Directeur sponsor choisi en section 1 |
| Gains | Formules A, B, gain net, payback | Saisie manuelle, aucun calcul |
| Preuve de réalisation | Obligatoire | Facultative, avec pièce jointe possible |
| Mot de passe | 8 caractères | 8 caractères, dont une majuscule et un chiffre |
| Routes de l'API | Sans préfixe | Préfixe `/api` |
