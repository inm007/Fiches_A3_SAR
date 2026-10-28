# Documentation de l'application Fiche A3 numérique SAR

Ce document décrit tout ce que fait l'application : le métier couvert, les profils, le parcours d'une fiche, les règles, les écrans, l'administration et l'architecture technique. Pour installer et lancer l'application, voir le [README](README.md). Pour un mode d'emploi court, profil par profil, voir le [guide d'utilisation](docs/guide-utilisateur.md).

## Sommaire

1. [À quoi sert l'application](#1-à-quoi-sert-lapplication)
2. [Profils et droits](#2-profils-et-droits)
3. [Parcours d'une fiche](#3-parcours-dune-fiche)
4. [Les 12 sections de la fiche](#4-les-12-sections-de-la-fiche)
5. [Validations](#5-validations)
6. [Actions, MOC et suivi](#6-actions-moc-et-suivi)
7. [Contrôles d'efficacité](#7-contrôles-defficacité)
8. [Gains économiques et formules](#8-gains-économiques-et-formules)
9. [Règles métier B1 à B8](#9-règles-métier-b1-à-b8)
10. [Confidentialité et visibilité](#10-confidentialité-et-visibilité)
11. [Notifications, relances et rappels](#11-notifications-relances-et-rappels)
12. [Historique, commentaires et pièces jointes](#12-historique-commentaires-et-pièces-jointes)
13. [Tableaux de bord](#13-tableaux-de-bord)
14. [Registre, exports et impression](#14-registre-exports-et-impression)
15. [Administration fonctionnelle](#15-administration-fonctionnelle)
16. [Administration technique et sécurité](#16-administration-technique-et-sécurité)
17. [Architecture technique](#17-architecture-technique)
18. [API](#18-api)
19. [Raccordements à la charge de la SAR](#19-raccordements-à-la-charge-de-la-sar)
20. [Données de démonstration et tests](#20-données-de-démonstration-et-tests)

## 1. À quoi sert l'application

La fiche A3 est l'outil d'amélioration continue de la SAR. Elle part d'un problème constaté sur le terrain : incident, écart d'indicateur, audit, inspection ou suggestion. Elle le mène jusqu'à une solution durable, dont les gains sont mesurés et validés.

L'application remplace la fiche papier ou Excel. Elle apporte :
- un parcours unique, avec des étapes et des validations imposées ;
- la traçabilité de chaque modification, avec son auteur, sa date et son motif ;
- le suivi des actions et des contrôles d'efficacité dans la durée ;
- la consolidation annuelle des gains en FCFA ;
- l'historique des interventions par équipement ;
- des tableaux de bord adaptés à chaque profil.

## 2. Profils et droits

Un utilisateur peut porter plusieurs rôles, appelés affectations. Chaque affectation est soit liée à une unité, soit globale, et elle a des dates de validité. Le profil actif se choisit en haut à droite de l'écran. Le menu, les fiches visibles et les boutons s'adaptent à ce profil.

| Profil | Ce qu'il fait |
|---|---|
| Agent | Déclare une fiche, suit ses déclarations et fait avancer les actions dont il est responsable. |
| Pilote | Rédige la fiche, soumet le plan puis la clôture, pilote les actions, saisit la mesure et les contrôles. |
| Valideur Production / Exploitation | Valide le plan en premier, sur toutes les fiches de son unité. |
| Valideurs HSE, Procédé / Technique, Maintenance, Inspection / Intégrité | Valident le plan quand leur domaine est coché en section 7. |
| Contrôle de gestion | Valide ou refuse chaque ligne de gain, puis approuve la porte 2 si des gains sont chiffrés. |
| Direction | Voit toutes les fiches, peut mettre en attente, reprendre et relancer. Peut être choisie comme sponsor. |
| Sponsor (un directeur choisi en section 1) | Donne l'accord final à la clôture (porte 2) : valider ou renvoyer la fiche. |
| Administrateur fonctionnel | Gère les comptes, les affectations, l'organigramme et les référentiels. Prévenu de chaque fiche déclarée sans pilote, il désigne un pilote de l'unité ; il change le pilote, partage une validation, change la confidentialité et voit l'équipe de chaque fiche. Ne modifie aucun autre contenu. |
| Administrateur technique | Consulte l'état technique et le journal d'administration. N'a accès à aucune fiche. |

Ce tableau est la matrice de départ : l'administrateur fonctionnel peut accorder ou retirer certains droits à un rôle depuis l'écran Droits des rôles (section 15).

Le serveur reste la source de vérité. Masquer un bouton n'est qu'un confort : chaque opération est revérifiée côté serveur, et un refus renvoie la liste des conditions manquantes.

## 3. Parcours d'une fiche

| Étape | Qui agit | Passage à l'étape suivante |
|---|---|---|
| 1. Ouvert | Agent ou pilote (déclaration) ; le pilote de l'unité se désigne lui-même, sinon l'administrateur fonctionnel désigne le pilote | T2 « Commencer l'analyse », par le pilote |
| 2. En cours | Pilote : sections 1 à 7 | T3 « Soumettre le plan », si les conditions B2 sont remplies |
| 3. En validation du plan | Valideurs de la porte 1 | T4 automatique quand tout est approuvé ; T5 retour à En cours en cas de refus |
| 4. Réalisation des actions | Responsables des actions ; pilote | T6 « Terminer les actions » : toutes terminées, au moins une réalisée, chaque cause racine garde une action |
| 5. Mesure des résultats | Pilote : section 8 | T7 « Passer à la vérification du maintien », seulement si l'objectif est atteint (oui ou partiellement) |
| 6. Vérification du maintien | Pilote : contrôles J+30, J+60, J+90 des actions, maintien du KPI principal à J+30, J+60, J+90, sections 9 à 11 | T8 « Soumettre la clôture » |
| 7. En validation de clôture | Contrôle de gestion (si des gains sont chiffrés), puis Direction | T9 automatique vers Clôturé ; T10 retour en cas de refus |
| 8. Clôturé | — | — |
| Classée sans suite | Direction ou administrateur fonctionnel | T14, depuis Ouvert ou En cours, avec un motif (doublon, hors sujet…) |

Quatre opérations s'ajoutent au parcours :
- **T11, nouvelle boucle** : depuis Mesure ou Vérification, si l'objectif n'est pas atteint ou si le gain n'est pas maintenu. La fiche repart à En cours avec une nouvelle boucle (numéro de version), et le motif est obligatoire. Les mesures Après et de maintien, l'objectif atteint et la date des résultats sont effacés : la boucle suivante se mesure à neuf. L'historique et la copie figée gardent les anciennes valeurs.
- **T14, classer sans suite** : pour un doublon ou un sujet hors périmètre, par la Direction ou l'administrateur fonctionnel, avant la validation du plan. La fiche sort des fiches en cours et des taux de clôture.
- **T12, mise en attente** : bloque la fiche, avec un motif obligatoire.
- **T13, levée du blocage** : la fiche revient exactement à l'étape où elle était.

À la déclaration (T1), le numéro A3-AAAA-NNN est attribué automatiquement. La numérotation recommence chaque année. Un pilote qui déclare une fiche de son unité coche « Je pilote cette fiche » et en devient pilote tout de suite ; un agent, ou un pilote d'une autre unité, laisse l'administrateur désigner le pilote. Quand un équipement est choisi, l'écran signale les fiches encore ouvertes sur cet équipement, pour éviter un doublon.

La date de lancement se remplit à la validation de la pertinence. À la fin de la section 4, comme pour le chef de département, le pilote compose son équipe : des agents et des pilotes actifs, même d'une autre unité. Chaque membre ajouté reçoit une invitation. Les membres voient la fiche ; après la pertinence, ils renseignent les sections 5 à 11 et déposent des pièces jointes. Les sections 1 à 4 restent en lecture seule pour eux, ils ne valident jamais la fiche et seul le pilote la soumet ou change d'étape. Une personne n'a qu'un rôle sur la fiche : un membre désigné pilote quitte l'équipe. Une copie figée de la fiche est enregistrée à chaque soumission du plan (T3) et à la clôture (T9) ; elle se consulte et s'imprime depuis la section 12.

**Prochaine étape.** En haut de la fiche, le pilote voit l'étape suivante, la liste de ce qui manque encore (calculée par le serveur, avec un bouton vers la section ou l'onglet concerné) et le bouton pour avancer quand tout est prêt. L'en-tête n'affiche qu'un bouton principal ; les autres actions sont dans « Plus d'actions ». Quand l'objectif n'est pas atteint, le bouton principal devient « Nouvelle boucle ». L'en-tête indique aussi la date de clôture au plus tôt (derniers contrôles et mesure J+90).

Toutes les transitions passent par un seul service, `FicheWorkflow`, sous verrou. Si deux personnes agissent en même temps, la seconde reçoit un conflit (409) et doit recharger la fiche.

## 4. Les 12 sections de la fiche

| N° | Section | Contenu | Modifiable par le pilote |
|---|---|---|---|
| 1 | Identification | Titre, unité, équipement, origine, type d'amélioration, sponsor choisi parmi les directeurs (il valide la clôture), dates, références SAP | Ouvert, En cours |
| 2 | Contexte, enjeu et problème | Contexte, impacts choisis par pastilles (HSE, production, qualité, énergie, sûreté) puis décrits, impact financier estimé | Ouvert |
| 3 | Situation actuelle | Indicateurs en cartes : rôle (KPI principal, à ne pas dégrader, suivi), sens, unité et source prises dans les listes administrables, valeur actuelle, cible, écart calculé pendant la saisie | Ouvert |
| 4 | Objectif | Rappel du KPI principal, objectif SMART (une phrase est proposée à partir du KPI), périmètre, résultats attendus obligatoires, chef de département qui valide la pertinence (le chef du département du pilote est proposé) | Ouvert |
| 5 | Analyse des causes racines | Méthode avec son aide, causes en cartes numérotées automatiquement, cause racine et preuve | En cours |
| 6 | Plan de contre-mesures | Actions regroupées par cause : type, responsable, échéance, coût, MOC lié, critère d'efficacité obligatoire. Une action réalisée ou annulée ne se modifie plus | En cours |
| 7 | Risques et MOC | Domaines concernés par pastilles, liste cochée des valideurs sollicités, risques (un risque coche son domaine), MOC requis, référence, statut et preuve | En cours, puis suivi du MOC en réalisation |
| 8 | Résultats après action | Valeur Après de chaque indicateur avec écart et amélioration calculés, objectif atteint proposé d'après la cible ; puis maintien du KPI principal à J+30, J+60 et J+90 | Mesure ; en Vérification, seulement le maintien |
| 9 | Gains économiques | Lignes de gain (catégorie, hypothèse, quantité, unité, coût unitaire), coût de mise en œuvre, ou « sans gain chiffré ». A, B, gain net et retour sur investissement se calculent pendant la saisie | Réalisation à Vérification |
| 10 | Standardisation et pérennisation | Actions de pérennisation ajoutées d'un geste par pastilles ; chacune doit être réalisée avec sa preuve avant la clôture | Réalisation à Vérification |
| 11 | Leçons apprises | Ce qui a marché, ce qui est à reproduire ailleurs | Mesure, Vérification |
| 12 | Validation | Signatures des deux portes, section en cause d'un refus, copies figées imprimables (lecture seule) | — |

Chaque section indique pourquoi elle est modifiable ou non, par une icône dans la liste des sections et un message en tête de section :
- **crayon** : modifiable maintenant ;
- **cadenas** : figée (étape passée, validation en cours, fiche en attente ou clôturée) ;
- **horloge** : s'ouvrira à une étape ultérieure, nommée dans le message ;
- **coche** : section 12, remplie par les décisions des valideurs.

Un profil qui ne rédige pas la fiche la voit en lecture seule, sans cadenas. Chaque section affiche aussi son dernier enregistrement (auteur et date).

Chaque section commence par une **astuce** repliable qui explique quoi écrire, ouverte tant que la section est vide. Les listes de lignes (indicateurs, causes, actions, risques, mesures, gains, pérennisation) s'affichent en cartes : plus de tableau à faire défiler.

Chaque section s'enregistre explicitement avec le bouton « Enregistrer ». Chaque champ modifié est inscrit dans l'historique. La complétude de chaque section (vide, partielle ou complète) s'affiche dans la barre des sections.

## 5. Validations

**Porte 0, la pertinence.** À la fin de la section 4, le pilote choisit le chef de département qui juge la pertinence (le chef de son département est proposé d'après l'organigramme). Le chef reçoit une notification et décide : **valider** (la fiche passe en cours, les sections 2 à 4 se figent et l'équipe rédige les sections 5 à 11), **à refaire** (la fiche revient au pilote avec son commentaire et, s'il le précise, la section à corriger), ou **classer sans suite** (motif obligatoire).

**Porte 2, la clôture.** Le Contrôle de gestion valide d'abord, si des gains sont chiffrés. Il valide ou refuse chaque ligne de gain, puis approuve la porte. La Direction approuve ensuite : la demande va au sponsor de la fiche quand il est titulaire du rôle Direction.

Avant de décider, le valideur voit un résumé de la fiche (problème, KPI, objectif, plan ou résultats, gains). En cas de refus, il peut indiquer la section à corriger ; en porte 2, il choisit ce qui est en cause (la mesure, ou le maintien et la clôture), ce qui fixe l'étape de retour.

Les règles du circuit sont les suivantes :
- **Choix du valideur** : la demande va au titulaire du rôle dans l'unité de la fiche, sinon à un titulaire global. Ce n'est jamais le pilote de la fiche.
- **Refus** : un commentaire est obligatoire (B6). La fiche retourne au pilote.
- **Signatures conservées** : après un refus puis une nouvelle soumission, une signature déjà obtenue reste valable tant que le domaine du valideur n'a pas changé. On ne refait donc pas valider tout le monde.
- **Validation partagée** : si un valideur est absent, malade, désactivé ou a perdu son affectation, sa demande apparaît dans « À régulariser » sur le tableau de bord de l'administrateur fonctionnel. Celui-ci la partage avec un autre titulaire du même rôle, avec un motif inscrit dans l'historique. Les deux valideurs voient la demande ; le premier qui décide la traite et signe, l'autre reste associé. Le partage se retire à tout moment.
- **Soumission impossible** : si un rôle nécessaire n'a aucun titulaire disponible, la soumission est refusée et le rôle manquant est indiqué.

## 6. Actions, MOC et suivi

Une action suit les statuts À faire, En cours, Réalisée, Bloquée et Annulée. Un blocage ou une annulation exige un motif. Passer une action à « Réalisée » exige une preuve (bon de travaux, photo, compte rendu) et programme automatiquement ses contrôles J+30, J+60 et J+90. Chaque action porte un critère d'efficacité, rappelé à chaque contrôle ; une action corrective reprend celui de l'action d'origine.

**MOC (B1).** Une action liée à un risque qui exige un MOC ne démarre pas tant que trois conditions ne sont pas réunies : le MOC est référencé, il est clôturé, et sa preuve de clôture est jointe.

**Pendant la réalisation, le pilote peut :**
- **replanifier** une action non terminée : reporter son échéance ou changer son responsable, avec un motif obligatoire. Le plan validé ne repasse pas en validation ;
- **ajouter une action** oubliée, rattachée à une cause de la fiche, avec un motif obligatoire ;
- **relancer** un responsable en retard, au plus une fois par 24 heures.

Le nouveau responsable est notifié à chaque attribution ou réattribution, et le responsable est notifié quand son échéance est reportée.

**Équipe.** Le registre affiche, pour chaque fiche, le pilote suivi de « + équipe (n) » : le survol montre le nom des membres ; le filtre « Équipe : Mes équipes » ne garde que les fiches dont on est membre, et le tableau de bord de l'agent et du pilote compte les « Fiches de mes équipes ». En ouvrant une fiche, un membre lit qui en est le pilote et ce qu'il peut modifier. Les membres reçoivent les approbations, refus et changements d'étape. Pour une absence du pilote, il ajoute un renfort à son équipe, ou l'administrateur change le pilote.

**Auto-désignation.** Un pilote qui déclare une fiche de son unité peut la piloter dès la déclaration (« Je pilote cette fiche »), ou plus tard (« Me désigner comme pilote ») tant qu'elle est ouverte et que personne ne la pilote. Un agent ne pilote jamais : l'administrateur désigne un pilote de l'unité. C'est inscrit dans l'historique. Il peut ainsi déclarer une fiche Restreint et la voir jusqu'à sa désignation.

**Changement de pilote.** Pour un départ définitif, l'administrateur fonctionnel peut changer le pilote à toute étape avant la clôture. Après l'étape Ouvert, un motif est obligatoire. Le nouveau pilote doit avoir une affectation Pilote sur l'unité de la fiche, et il ne peut pas être le seul valideur disponible d'une demande en attente (B8). L'ancien et le nouveau pilote sont prévenus. Une demande de validation que le nouveau pilote détenait sur cette fiche passe au titulaire suivant.

## 7. Contrôles d'efficacité

Chaque action réalisée crée trois contrôles, à J+30, J+60 et J+90. Un contrôle devient disponible à sa date, et le pilote en est notifié. Le pilote le déclare conforme ou non conforme, au regard du critère d'efficacité de l'action. Un contrôle conforme exige un constat ou une preuve.

**Maintien du KPI principal.** En plus des contrôles par action, le KPI principal est remesuré à J+30, J+60 et J+90 de la date des résultats (T7), en section 8. Chaque mesure se saisit à partir de son échéance. Si une mesure ne tient plus la cible, la clôture est refusée et l'écran propose une nouvelle boucle.

Un contrôle non conforme exige une action corrective, avec une description, un responsable et une échéance (B4). Cette action corrective est vérifiée par un contrôle unique, 30 jours après sa réalisation (hypothèse D2).

La clôture ne peut pas être soumise tant que les contrôles ne sont pas tous renseignés. Un contrôle dont la date n'est pas encore arrivée est signalé « à venir » : la clôture attend sa date.

## 8. Gains économiques et formules

Les calculs sont centralisés dans la classe `Calculs`. Une valeur impossible à calculer (dénominateur nul ou donnée absente) s'affiche « Non calculable ».

| Grandeur | Formule |
|---|---|
| Amélioration d'un indicateur (%) | (après − avant) ÷ avant × 100 × s, avec s = +1 si la hausse est souhaitée, −1 si c'est la baisse |
| Gain annuel d'une ligne (FCFA) | quantité × coût unitaire, arrondi à l'entier |
| Total A | somme des gains annuels des lignes validées |
| Coût B | coût de mise en œuvre |
| Gain net annuel | A − B |
| Délai de retour (années) | B ÷ A, seulement si A > 0 |

Le Contrôle de gestion valide ou refuse chaque ligne de gain. Une fiche peut être clôturée « sans gain chiffré » : dans ce cas, la porte 2 ne passe que par la Direction.

## 9. Règles métier B1 à B8

| Règle | Contenu |
|---|---|
| B1 | Une action sous MOC ne démarre pas tant que le MOC n'est pas référencé, clôturé et prouvé. |
| B2 | Le plan ne se soumet que complet : type et date cible, contexte, indicateur principal avec sa valeur actuelle et sa cible, objectif SMART, résultats attendus, méthode d'analyse, au moins une cause dont une cause racine, au moins une action dont une sur une cause racine, un critère d'efficacité sur chaque action, au moins un domaine, et un titulaire disponible pour chaque valideur. |
| B3 | La mesure ne se valide qu'avec la valeur Après du KPI principal et des KPI à ne pas dégrader, et un objectif atteint (oui, ou partiellement avec l'écart expliqué). Un objectif non atteint impose une nouvelle boucle. |
| B4 | Pas de clôture sans contrôles J+30, J+60 et J+90 renseignés pour chaque action non annulée, ni sans le maintien du KPI principal tenu à J+30, J+60 et J+90 ; un contrôle non conforme exige une action corrective et sa vérification. Chaque action de pérennisation doit être réalisée avec sa preuve. |
| B5 | Pas de clôture sans l'approbation de la Direction, et du Contrôle de gestion si des gains sont chiffrés (chaque ligne de gain doit d'abord être validée ou refusée). |
| B6 | Tout refus et tout blocage exigent un commentaire ou un motif. |
| B7 | Une décision n'est possible que sur une demande en attente, à l'étape active de sa porte, une fois les demandes prioritaires approuvées. |
| B8 | Ni le pilote ni un membre de l'équipe ne valident la fiche, à aucune porte. Le sponsor et le chef choisis ne peuvent ni piloter la fiche ni faire partie de l'équipe. |

En cas de refus, le serveur renvoie toujours la liste exacte de ce qui manque. L'écran l'affiche dans un panneau « Conditions manquantes ». Quand un manque concerne une section, les actions, les contrôles ou les validations, un bouton « Ouvrir… » y mène directement, jusqu'à l'action concernée.

## 10. Confidentialité et visibilité

Une fiche est soit **Normal**, soit **Restreint**. Le pilote ou l'administrateur fonctionnel change ce réglage, et le pilote doit donner un motif.

| Profil | Fiches visibles |
|---|---|
| Direction, administrateur fonctionnel | Toutes |
| Agent | Celles qu'il a déclarées et celles où il est responsable d'une action |
| Pilote | Celles qu'il pilote, celles dont il est membre de l'équipe, plus les fiches Normal qu'il a déclarées ou où il a une action, et les fiches Restreint qu'il a déclarées tant qu'elles sont ouvertes sans pilote |
| Membre d'une équipe (agent ou pilote) | En plus de sa portée, les fiches de son équipe |
| Chef de département | Les fiches qui lui sont soumises (porte 0) |
| Valideur | Fiches Normal de son unité dont son domaine est concerné (Production voit toutes celles de son unité), plus toute fiche où il est sollicité, seul ou en partage |
| Contrôle de gestion | Fiches Normal avec des gains, fiches avec des gains à valider, fiches où il est sollicité |
| Administrateur technique | Aucune |

Une fiche hors de portée répond « Fiche introuvable » (404), jamais « interdit » (403), pour ne pas révéler son existence. La même règle s'applique à ses actions, pièces jointes, commentaires et historique.

## 11. Notifications, relances et rappels

Toutes les notifications arrivent dans la cloche en haut à droite et sur la page Notifications. Le compteur se met à jour toutes les minutes.

| Événement | Destinataire |
|---|---|
| Désignation ou changement de pilote | Nouveau pilote, ancien pilote |
| Ajout à l'équipe (invitation), retrait de l'équipe | Membre concerné |
| Demande de validation, partage d'une demande | Valideur, valideur associé |
| Approbation, refus, renvoi à refaire, classement par le chef | Pilote et membres de l'équipe |
| Plan approuvé, action attribuée ou réattribuée, échéance reportée | Responsable de l'action |
| Changement de statut d'une action | Pilote et responsable |
| Échéance proche (3 jours avant par défaut) | Responsable |
| Action en retard | Responsable, avec copie au pilote |
| Validation en attente depuis le délai | Valideur |
| Contrôle J+30, J+60 ou J+90 disponible | Pilote |
| Relance manuelle | Personne relancée |

Les rappels automatiques partent chaque jour à 07:00, par la commande `a3:relances` lancée par le planificateur Laravel. Le délai des relances, le préavis d'échéance et l'activation des rappels de validation se règlent dans les paramètres fonctionnels.

La relance manuelle (bouton « Relancer ») est ouverte au pilote, à la Direction et à l'administrateur fonctionnel. Elle est limitée à une par 24 heures et par élément.

## 12. Historique, commentaires et pièces jointes

**Historique.** Il garde, pour chaque changement, l'auteur, la date, l'ancienne et la nouvelle valeur, et le motif. Cela couvre les changements d'étape, chaque champ modifié, les décisions, les reports, les partages et les changements de pilote. L'historique est immuable : un déclencheur PostgreSQL interdit toute modification ou suppression, même en SQL direct. Il est visible par le pilote, la Direction et l'administrateur fonctionnel.

**Commentaires.** On peut les rattacher à la fiche, à une action ou à une validation.

**Pièces jointes.** Les formats acceptés sont PDF, PNG, JPEG, DOCX, XLSX et PPTX. Le type réel du fichier est vérifié. La taille maximale (10 Mo par défaut) et le nombre maximal par fiche (20 par défaut) sont réglables. Le pilote dépose sur toute sa fiche ; un agent, ou un pilote sur la fiche d'un autre, ne dépose que sur une action dont il est responsable. Les fichiers sont stockés sur un disque privé et téléchargés après authentification, sans adresse publique.

## 13. Tableaux de bord

Chaque profil a son propre tableau de bord :
- **Agent et pilote** : mes fiches, mes actions, les actions en retard, les contrôles à faire et la liste « À traiter ».
- **Valideurs** : les demandes en attente, l'ancienneté de la plus vieille demande et les décisions récentes.
- **Contrôle de gestion** : les gains à valider, les gains validés et le gain net annuel validé de l'année choisie.
- **Direction** :
  - fiches ouvertes, fiches et actions en retard, fiches sans pilote ;
  - taux et délai moyen de clôture de l'année ;
  - part des fiches avec vérification d'efficacité renseignée ;
  - gain net annuel validé ;
  - répartition par unité, type d'amélioration et origine ;
  - portefeuille par étape et déclarations des six derniers mois.
- **Administrateur fonctionnel** : les pilotes à désigner et les validations bloquées à partager, dans le bloc « À régulariser ».

Le sélecteur d'année permet de consulter l'année en cours et les années précédentes. La consolidation de l'année écoulée reste donc accessible après le 1er janvier.

## 14. Registre, exports et impression

**Registre « Fiches ».** On peut y faire une recherche par numéro, titre, énoncé ou équipement (code ou libellé). Il propose des filtres par étape, unité, équipement, type, origine, confidentialité et date de création. Le lien « historique » à côté de l'équipement d'une fiche ouvre toutes les fiches visibles sur cet équipement.

**Export Excel.** Il est disponible pour le registre, les validations, les notifications et les écrans d'administration.

**Impression A3.** Le bouton « Exporter en PDF A3 » ouvre une vue A3 paysage avec les 12 sections et les contrôles J+30, J+60 et J+90. Il suffit ensuite de choisir « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur.

## 15. Administration fonctionnelle

| Écran | Contenu |
|---|---|
| Utilisateurs | Création, modification et désactivation des comptes. Un compte local reçoit son lien de mot de passe dès sa création ; le bouton « Envoyer le lien » le renvoie. |
| Affectations | Rôle, unité ou périmètre global, dates de début et de fin |
| Droits des rôles | Tableau rôles × droits : accorder ou retirer à un rôle le droit de déclarer une fiche, de consulter l'historique, de commenter, de relancer, ou de mettre en attente et lever le blocage |
| Unités, Équipements | Référentiels du site |
| Listes | Origines, types d'action, catégories de gain, types de pérennisation…, avec ordre d'affichage et désactivation |
| Paramètres fonctionnels | Délai des relances, préavis d'échéance, rappels de validation, limites des pièces jointes |
| Organigramme | Directions, départements et services, avec leur responsable : le responsable d'un département reçoit le profil Chef de département, et il est proposé au pilote comme chef qui valide |
| Circuit de validation | Directeurs qui valident chaque domaine coché en section 7 |
| Fiches | Désigner ou changer le pilote, voir l'équipe, partager une validation, passer en Normal ou Restreint |

Les données ne sont jamais supprimées, seulement désactivées. Chaque opération d'administration est inscrite au journal d'administration.

L'écran Droits des rôles présente un tableau rôles × droits, regroupé par famille de rôles (terrain, validation, direction, administration). Chaque case est dans l'un de quatre états :
- **Réglable** : un interrupteur accorde ou retire le droit au rôle ;
- **Toujours** : le droit est indispensable au rôle et ne se retire pas (l'Agent et le Pilote déclarent et commentent, le Pilote consulte l'historique) ;
- **Ses fiches** : le Pilote relance et met en attente les fiches qu'il pilote, sans réglage possible ;
- **Sans objet** : le droit ne concerne pas ce rôle (l'administrateur fonctionnel ne commente pas, un valideur ne déclare pas).

Le circuit de validation, la visibilité des fiches, la confidentialité et l'administration ne sont pas réglables. L'administrateur technique n'apparaît pas dans le tableau. Un changement s'applique dès la requête suivante de l'utilisateur concerné.

## 16. Administration technique et sécurité

La page **État technique** affiche le fournisseur d'authentification, l'état de SAP et le journal d'administration.

**Sécurité :**
- Authentification par session (Laravel Sanctum, cookies et CSRF). Pas d'inscription publique.
- Session fermée après 30 minutes sans activité. Une fenêtre prévient 2 minutes avant, avec un bouton « Rester connecté ».
- Mot de passe d'au moins 8 caractères, avec au moins une majuscule et un chiffre. Réinitialisation par lien envoyé par courriel.
- Nombre de tentatives de connexion limité, avec un délai affiché avant de pouvoir réessayer.

## 17. Architecture technique

| Couche | Technologie |
|---|---|
| Serveur | Laravel 13 (PHP), PostgreSQL |
| Interface | React 19, Vite |
| Authentification | Laravel Sanctum en mode SPA |

Les règles métier vivent dans `backend/app/Services` :

| Service | Rôle |
|---|---|
| `FicheWorkflow` | Seul service qui change l'étape (T1 à T13), sous verrou |
| `ValidationCircuit` | Portes 1 et 2, titulaires, signatures, partage des demandes |
| `FicheSectionService` | Enregistrement des sections selon l'étape |
| `ActionService` | Statuts, MOC, replanification, ajout, actions correctives |
| `ControleEfficaciteService` | Contrôles J+30/60/90 et contrôle correctif |
| `Calculs` | Formules |
| `FicheVisibility` | Portée des fiches par profil |
| `RelanceService` | Relances manuelles et rappels quotidiens |
| `NotificationService`, `HistoryLogger` | Notifications internes, historique immuable |
| `PieceJointeService` | Dépôt et téléchargement des fichiers |
| `ActiveProfile` | Profil actif en session |
| `FicheVersions` | Copies figées de la fiche (soumission du plan, clôture) |

Côté interface, `frontend/src` contient :
- `auth/` : client API et contexte de session ;
- `services/` : appels métier ;
- `components/fiche/` : en-tête, sections, onglets, actions de workflow ;
- `pages/` : tableau de bord, registre, validations, notifications, administration.

## 18. API

Toutes les routes sont préfixées par `/api`.

| Domaine | Routes principales |
|---|---|
| Authentification | `POST /auth/connexion`, `/auth/deconnexion`, `/auth/profil-actif`, `/auth/mot-de-passe-oublie`, `/auth/mot-de-passe` ; `GET /auth/moi` |
| Fiches | `GET/POST /fiches`, `GET /fiches/{id}`, `POST /fiches/{id}/me-designer`, `PUT /fiches/{id}/sections/{n}`, `POST /fiches/{id}/transitions`, `POST /fiches/{id}/confidentialite`, `GET /fiches/{id}/historique`, `GET /fiches/{id}/versions` (copies figées), `GET /fiches/{id}/options` |
| Workflow | `GET /validations`, `POST /validations/{id}/decision`, `POST /actions/{id}/statut`, `PATCH /actions/{id}`, `POST /fiches/{id}/actions`, `PATCH /controles/{id}`, `POST /gains/{id}/decision`, `POST /relances` |
| Pièces jointes, commentaires | `GET/POST /fiches/{id}/pieces-jointes`, `GET /pieces-jointes/{id}/telechargement`, `GET/POST /fiches/{id}/commentaires` |
| Transversal | `GET /referentiels`, `GET /tableau-de-bord?annee=`, `GET /notifications`, `GET /notifications/non-lues`, `POST /notifications/{id}/lu`, `POST /notifications/tout-lu` |
| Administration fonctionnelle | `/admin/entities` (organigramme), `/admin/circuit`, `/admin/users`, `/admin/assignments`, `GET/PUT /admin/permissions`, `/admin/units`, `/admin/equipment`, `/admin/lists`, `/admin/settings`, `/admin/roles`, `/admin/fiches`, `/admin/fiches/{id}/validations`, `POST/DELETE /admin/validations/{id}/partages` |
| Administration technique | `GET /technique`, `GET /technique/logs` |

Les codes d'erreur sont les suivants :
- **403** : opération interdite à ce profil ;
- **404** : fiche invisible pour ce profil ;
- **409** : la fiche a changé entre-temps ;
- **422** : des conditions manquent, et la réponse en donne la liste dans `manques`, avec dans `emplacements` l'endroit de la fiche où corriger chacune quand il est connu. Le code qui écrit un manque choisit cet emplacement avec la classe `App\Support\Manque`.

## 19. Raccordements à la charge de la SAR

Ces raccordements se font par configuration, dans `backend/.env`, sans toucher au code :

| Raccordement | Variables | État livré |
|---|---|---|
| Annuaire LDAP | `AUTH_PROVIDER=ldap` | `local` |
| SAP (lecture) | `SAP_ENABLED=true` | `false` : les références SAP sont saisies à la main |
| Serveur de courriel | `MAIL_*` | `log` : les courriels sont écrits dans `storage/logs` |

`APP_NAME` donne le nom d'expéditeur des courriels (« Fiche A3 SAR » par défaut).

En production, passer aussi `APP_ENV=production` et `APP_DEBUG=false`. Il faut enfin ajouter au cron du serveur la ligne du planificateur, indiquée dans le README.

## 20. Données de démonstration et tests

La commande `php artisan migrate:fresh --seed` crée :
- 3 unités et 10 équipements ;
- 22 comptes, deux par rôle, tous avec le mot de passe `Azerty123` ;
- 16 fiches, une par situation du parcours, dont une classée sans suite.

Les fiches sont simulées à travers les vrais services. L'historique, les validations, les contrôles et les notifications sont donc cohérents.

**Comptes** (`DemoAccountsSeeder`) : deux par rôle, 26 comptes actifs, plus un ancien agent désactivé.

| Rôle | Compte 1 | Compte 2 |
|---|---|---|
| Agent | `agent.demo` (DIST) | `agent2.demo` (REF, UTIL) |
| Pilote | `pilote.demo` (DIST, REF) | `pilote2.demo` (REF, UTIL) |
| Chef de département | `chef.demo` (Exploitation) | `chef2.demo` (Maintenance) |
| Production / Exploitation | `valideur.demo` (DIST) | `valideur2.demo` (REF, UTIL) |
| HSE, Procédé, Maintenance, Inspection, DSI | `valideur-hse.demo`, `valideur-procede.demo`… (DIST) | `valideur-hse2.demo`, `valideur-procede2.demo`… (REF, UTIL) |
| Contrôle de gestion | `controle.demo` | `controle2.demo` |
| Direction (sponsors) | `direction.demo` | `direction2.demo` |
| Administrateur fonctionnel | `admin-fonctionnel.demo` | `admin-fonctionnel2.demo` |
| Administrateur technique | `admin-technique.demo` | `admin-technique2.demo` |

Le circuit de démonstration sollicite aussi la Maintenance pour la fiabilité et l'Inspection pour l'intégrité, pour que chaque directeur ait des demandes.

**Fiches** (`DemoFichesSeeder`) : 30 fiches, rangées par compte déclarant. Le pilote de DIST est `pilote.demo`, celui de REF et UTIL `pilote2.demo` ; un pilote qui déclare pilote lui-même sa fiche.

| Compte | Fiches et étapes |
|---|---|
| `agent.demo` (10) | 2 clôturées (dont une sans gain), en attente du sponsor (un gain refusé par le Contrôle de gestion), vérification J+90, nouvelle boucle (version 2), réalisation avec une action en retard relancée, en attente de la Production, renvoyée par le chef, sans pilote, classée comme doublon |
| `agent2.demo` (12) | clôturée, clôture refusée par le sponsor, gains à valider (demande partagée avec `controle2.demo`), contrôle J+60 non conforme, mesure des résultats, MOC bloquant, en attente, plan refusé, en attente du directeur de domaine, soumise au chef, classée par le chef, sans pilote |
| `pilote.demo` (5) | clôturée, réalisation (`pilote2.demo` dans l'équipe), plan prêt, analyse en cours avec l'équipe, soumise au chef |
| `pilote2.demo` (3) | clôturée (`pilote.demo` dans l'équipe), vérification J+90, en rédaction |

Les fiches sont simulées à travers les vrais services, en remontant jusqu'à 175 jours dans le temps : l'administrateur désigne le pilote, le pilote remplit les sections 1 à 4 avec le sponsor et le chef, le chef valide, puis le plan, les actions, les contrôles et la clôture suivent. L'historique, les validations, les versions figées, les relances et les notifications sont donc cohérents.

**Activité** (`DemoActiviteSeeder`) : commentaires sur les fiches, les actions et les refus ; pièces jointes réelles (comptes rendus PDF sur les actions et la pérennisation, photos du constat) dans le stockage privé ; références SAP complétées ; paramètres ; journal d'administration (création des comptes, affectations, désignations, partages, réglages) ; rappels automatiques ; notifications de plus de trois jours marquées comme lues.

Les comptes sont aussi créés en environnement `testing` ; les fiches et l'activité ne le sont qu'en `local`.

Les tests du serveur (PHPUnit sur PostgreSQL) tournent sur une base dédiée, `fiche_a3_test`, recréée à chaque lancement (`RefreshDatabase`) : ils ne touchent jamais la base de démonstration. Créer cette base une fois (`createdb fiche_a3_test`) ; son nom se change dans `backend/phpunit.xml`. Ils couvrent :
- le parcours complet ;
- les règles B1 à B8 ;
- la visibilité et les droits par profil ;
- les calculs ;
- les relances ;
- les pièces jointes ;
- le suivi dans la durée ;
- le cycle renforcé : auto-désignation, objectif non atteint, nouvelle boucle, maintien, classement sans suite, copies figées, sponsor et prochaine étape.

Côté écran, `npm test` vérifie aussi les calculs refaits pendant la saisie (`src/utils/a3Calculs.js`), qui reprennent les formules du serveur.

Pour les lancer :

```bash
cd backend && php artisan test --compact && vendor/bin/pint --test
cd frontend && npm run lint && npm test && npm run build
```
