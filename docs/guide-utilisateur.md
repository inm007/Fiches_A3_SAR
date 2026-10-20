# Guide d'utilisation — Fiche A3 numérique SAR

Ce guide décrit, profil par profil, ce que chacun fait dans l'application. Le menu de gauche et les boutons d'une fiche s'adaptent au profil actif ; un utilisateur qui a plusieurs rôles change de profil en haut à droite.

La session se ferme après 30 minutes sans activité. Une fenêtre prévient 2 minutes avant : cliquez sur « Rester connecté » pour garder une saisie en cours.

Les notifications arrivent dans la cloche, en haut à droite, et sur la page Notifications. Le compteur se met à jour toutes les minutes.

## Parcours d'une fiche

1. **Ouvert** : un agent ou un pilote déclare le problème.
2. **En cours** : le pilote désigné rédige l'analyse et le plan (sections 1 à 7).
3. **En validation du plan** : Production / Exploitation valide d'abord, puis les valideurs des domaines cochés.
4. **Réalisation des actions** : chaque responsable fait avancer ses actions.
5. **Mesure des résultats** : le pilote saisit la mesure après action (section 8).
6. **Vérification du maintien** : contrôles d'efficacité à J+30, J+60 et J+90 après chaque action.
7. **En validation de clôture** : Contrôle de gestion (si des gains sont chiffrés), puis Direction.
8. **Clôturé**.

Une fiche peut être mise en attente avec un motif (« Mettre en attente »), puis reprise à l'étape où elle était (« Lever le blocage »).

## Agent

- **Déclarer une fiche** : « Nouvelle fiche », puis titre, unité, origine et énoncé du problème. L'équipement est conseillé : il permet ensuite de retrouver l'historique de l'équipement. Le numéro A3-AAAA-NNN est attribué à l'enregistrement.
- **Suivre ses déclarations** : le tableau de bord et le registre « Fiches » montrent les fiches déclarées et celles où l'on est responsable d'une action.
- **Faire avancer ses actions** : dans l'onglet Actions, boutons « Démarrer », « Réaliser », « Bloquer » (motif obligatoire). Une action liée à un MOC ne démarre qu'une fois le MOC clôturé, référencé et prouvé.
- **Rappels reçus** : une notification quand une action vous est attribuée, quand son échéance approche et quand elle est en retard.

## Pilote

- **Se désigner pilote** : sur une fiche que vous venez de déclarer dans votre unité, « Me désigner comme pilote » vous en confie le pilotage sans passer par l'administrateur.
- **Rédiger la fiche** : sections 1 à 7 à l'étape En cours. « Enregistrer » sauvegarde un brouillon ; l'état de sauvegarde s'affiche à côté du bouton.
- **Lire les cadenas** : dans la liste des sections, un crayon marque ce que vous pouvez modifier maintenant, un cadenas une section figée (étape passée, validation en cours, fiche en attente ou clôturée), une horloge une section qui s'ouvrira plus tard. Survolez la section ou ouvrez-la pour lire la raison.
- **Fiche partagée** : si l'administrateur vous associe à la fiche d'un collègue absent, vous la voyez et la faites avancer comme la vôtre. Chaque section indique qui l'a enregistrée en dernier, et l'onglet Historique montre tout ce que l'autre pilote a fait.
- **Soumettre le plan** : si un élément manque, la liste des conditions manquantes s'affiche, avec un bouton « Ouvrir… » qui mène à la section, à l'action ou au contrôle à compléter.
- **Pendant la réalisation** :
  - « Replanifier » une action pour reporter son échéance ou changer son responsable, avec un motif ;
  - « Ajouter une action » oubliée, rattachée à une cause, avec un motif ;
  - « Relancer » un responsable en retard (une fois par 24 h).
- **Mesurer et vérifier** : section 8 (mesure après action, objectif atteint), puis onglet Contrôles. Une notification prévient quand un contrôle J+30, J+60 ou J+90 est disponible. Un contrôle non conforme demande une action corrective, vérifiée 30 jours après sa réalisation.
- **Soumettre la clôture** : sections 9 (gains ou « sans gain chiffré »), 10 (pérennisation) et 11 (leçons apprises). Tant qu'un contrôle J+30, J+60 ou J+90 n'est pas encore arrivé à sa date, il est signalé « à venir » et la clôture l'attend.
- **Nouvelle boucle** : si l'objectif n'est pas atteint ou le gain pas maintenu, « Nouvelle boucle » renvoie la fiche à En cours avec une nouvelle version.
- **Imprimer** : « Exporter en PDF A3 » ouvre l'impression ; choisir « Enregistrer au format PDF ».

## Valideurs métier

- La page **Validations** liste les demandes adressées au profil actif, avec leur ancienneté.
- Ouvrir la fiche, onglet Validations : « Approuver » ou « Refuser ». Un refus exige un commentaire et renvoie la fiche au pilote.
- Un valideur ne valide jamais une fiche dont il est le pilote.

## Contrôle de gestion

- Valider ou refuser chaque ligne de gain (section 9), puis approuver la porte 2.
- Le tableau de bord donne le gain net annuel validé. Le sélecteur d'année, dans le cadre vert, permet de consulter la consolidation d'une année écoulée.

## Direction

- Approuve la clôture ; peut mettre en attente, reprendre et relancer.
- Le tableau de bord montre les fiches ouvertes et en retard, le taux et le délai de clôture de l'année choisie, la part des fiches avec vérification d'efficacité renseignée, le gain net annuel validé et la répartition des fiches par unité, type d'amélioration et origine.

## Administrateur fonctionnel

- **Comptes** : « Administration → Utilisateurs ». Un nouveau compte local reçoit aussitôt son lien de définition du mot de passe ; « Envoyer le lien » le renvoie.
- **Affectations** : un rôle est porté par une affectation (rôle, unité ou périmètre global, dates).
- **Référentiels** : unités, équipements, listes de choix, paramètres fonctionnels (délai des rappels, préavis d'échéance, limites des pièces jointes).
- **Pilote** : désigner le pilote d'une fiche ouverte, ou le changer à toute étape avant la clôture en cas de départ définitif (motif obligatoire après l'étape Ouvert).
- **Fiche partagée** : pour une absence (maladie, congé) ou un renfort, « Partager la fiche » associe un second pilote de l'unité. Les deux pilotes travaillent sur la même fiche ; retirez le partage quand il n'est plus utile.
- **Validation bloquée** : quand un valideur est absent ou n'a plus son affectation, la demande apparaît dans « À régulariser » sur le tableau de bord. Sur la fiche, « Partager une validation » l'ouvre aussi à un autre titulaire du même rôle ; le premier qui décide la traite.
- **Confidentialité** : passer une fiche en Restreint ou en Normal. L'administrateur ne modifie aucun autre contenu.

## Administrateur technique

- La page **État technique** donne le fournisseur d'authentification, l'état de SAP et le journal d'administration. Il n'a accès à aucune fiche.
- Les raccordements à l'annuaire, à SAP et au serveur de courriel se règlent dans le fichier `backend/.env` (voir le README).
