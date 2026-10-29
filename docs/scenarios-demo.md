# Scénarios de démonstration — Fiche A3 numérique

Ce document déroule la présentation rôle par rôle : quel compte ouvrir, sur quelle fiche aller et quoi montrer.
Toutes les données viennent des seeders (`php artisan migrate:fresh --seed`, en `APP_ENV=local`).

## 0. Préparer la démo (5 minutes avant)

```bash
cd backend
php artisan migrate:fresh --seed   # repart d'une base propre : 32 fiches, 29 comptes, activité réaliste
php artisan serve                  # http://127.0.0.1:8000
cd ../frontend && npm run dev      # http://127.0.0.1:5173
```

- **Mot de passe de tous les comptes de démonstration : `Azerty123`**
- Relancer `migrate:fresh --seed` remet tout à zéro : à faire juste avant la présentation, et après une répétition.
- Les dates sont calculées à partir du jour du seed (fiches ouvertes il y a 1 à 175 jours) : les retards, échéances proches et contrôles J+30/J+60/J+90 sont donc toujours cohérents le jour J.
- Les numéros (A3-2026-0xx) ci-dessous sont ceux obtenus après un `migrate:fresh --seed`.
- Astuce : ouvrir une fenêtre de navigation privée par compte pour passer d'un rôle à l'autre sans se déconnecter.

## 1. Les comptes

| Rôle | Compte principal | Second compte | Périmètre |
|---|---|---|---|
| Agent | `agent.demo` (Amadou Ndiaye) | `agent2.demo` (Seynabou Diallo) | DIST / REF + UTIL |
| Pilote | `pilote.demo` (Fatou Sarr) | `pilote2.demo` (Ibrahima Fall) | DIST + REF / REF + UTIL |
| Chef de département (porte 0) | `chef.demo` (Mamadou Diagne, Dép. Exploitation) | `chef2.demo` (Aminata Touré, Dép. Maintenance) | rôle donné par l'organigramme |
| Directeur Production | `valideur.demo` | `valideur2.demo` | DIST / REF + UTIL |
| Directeur QHSE | `valideur-hse.demo` | `valideur-hse2.demo` | DIST / REF + UTIL |
| Directeur technique (Procédé) | `valideur-procede.demo` | `valideur-procede2.demo` | DIST / REF + UTIL |
| DSI (Sûreté / Cyber) | `valideur-dsi.demo` | `valideur-dsi2.demo` | DIST / REF + UTIL |
| Valideur Maintenance | `valideur-maintenance.demo` | `valideur-maintenance2.demo` | DIST / REF + UTIL |
| Valideur Inspection | `valideur-inspection.demo` | `valideur-inspection2.demo` | DIST / REF + UTIL |
| Contrôle de gestion | `controle.demo` (Awa Ndour) | `controle2.demo` (Babacar Mbengue) | global |
| Direction (sponsor) | `direction.demo` (Ibrahima Sy) | `direction2.demo` (Coumba Gueye) | global |
| Administrateur fonctionnel | `admin-fonctionnel.demo` | `admin-fonctionnel2.demo` | global |
| Administrateur technique | `admin-technique.demo` | `admin-technique2.demo` | global, sans accès au contenu des fiches |

Comptes particuliers :
- `ancien-agent.demo` : compte **désactivé** (départ à la retraite), affectation terminée. Il ne peut pas se connecter : montrer qu'il reste visible dans l'administration.
- `ramatoulaye.sene` : compte **annuaire (LDAP)** créé avec l'assistant, sans mot de passe local. Il ne se connecte pas en démo : il sert à montrer qu'un compte annuaire est reconnu comme « déjà créé » dans l'assistant.

Unités : **DIST** (Distillation atmosphérique), **REF** (Reformage catalytique), **UTIL** (Utilités).

## 2. Carte des fiches

| N° | Titre | Étape | Ce qu'elle illustre |
|---|---|---|---|
| 001 | Fuite récurrente sur la pompe P-201 | Clôturée | Cycle complet, deux gains validés |
| 002 | Standardiser la consignation des vannes | Clôturée | Clôture **sans gain chiffré** |
| 003 | Pertes de rendement au four F-101 | Validation de clôture | Un gain **refusé** par le CG, **attente du sponsor** (direction.demo) |
| 004 | Vapeur au rebouilleur E-104 | Vérification du maintien | J+30 et J+60 conformes, sections 9 à 11 remplies, J+90 à saisir |
| 005 | Dépassements de soufre sur le gasoil | En cours (version 2) | Objectif non atteint : **nouvelle boucle** |
| 006 | Dérive de température C-101 | Réalisation des actions | Action réalisée + action **en retard relancée** |
| 007 | Transferts perdus labo / SNCC | Validation du plan | 3 directeurs sollicités en parallèle (Production, Procédé, DSI) |
| 008 | Bruit anormal sur le dessaleur D-120 | Ouvert | Pertinence **renvoyée** par le chef (à refaire) |
| 009 | Éclairage insuffisant passerelle du four | Ouvert | **Sans pilote**, origine créée sous « Autre » |
| 010 | Fuite P-201 (déclarée deux fois) | Classée sans suite | Doublon classé par l'admin |
| 011 | Arrêts intempestifs pompe d'eau | Clôturée | Demande CG **réattribuée** à controle2 |
| 012 | Encrassement des échangeurs | Vérification du maintien | Clôture **refusée par le sponsor**, renvoyée en vérification |
| 013 | Vibrations du compresseur K-301 | Validation de clôture | Gains à valider par **controle.demo**, demande **partagée** avec controle2 |
| 014 | Corrosion sous calorifuge L-12 | Vérification du maintien | Fiche **restreinte** + contrôle J+60 **non conforme** et action corrective |
| 015 | Pertes d'hydrogène réacteur R-401 | Mesure des résultats | Actions terminées, résultats à saisir |
| 016 | Torchage lors des redémarrages | Réalisation des actions | Action **bloquée par un MOC** ouvert |
| 017 | Automate de la turbine T-02 | En attente | **Mise en attente** avec motif (arrêt programmé) |
| 018 | Traitement chimique eau de refroidissement | En cours | Plan **refusé** à la porte 1, à resoumettre |
| 019 | Givrage aéroréfrigérant A-430 | Validation du plan | Production a validé, Procédé et Inspection pas encore |
| 020 | Capteur défaillant ballon B-07 | Validation de pertinence | En attente de **chef2.demo**, relancée |
| 021 | Repeindre les garde-corps | Classée sans suite | Classée par le **chef** à la porte 0 |
| 022 | Fuite d'huile palier T-02 | Ouvert | **Sans pilote**, origine créée sous « Autre » |
| 023 | Purges vapeur chaudes P-650 | Validation du plan | En attente de valideur2 (Production) et valideur-hse2 (QHSE) |
| 024 | Temps de démarrage du four F-101 | Clôturée | Fiche déclarée par un pilote, avec équipe |
| 025 | Fiabiliser le compresseur K-301 | Réalisation des actions | Équipe de 2 membres (agent2 + pilote2), action en retard |
| 026 | Fiabiliser les purgeurs vapeur | En cours | Plan prêt (sections 5 à 7), **pas encore soumis** |
| 027 | Optimiser le lavage du dessaleur | En cours | Équipe constituée, analyse des causes, un membre **retiré** |
| 028 | Déchets d'emballage du magasin | Validation de pertinence | Fiche **restreinte** chez chef.demo |
| 029 | Perte de catalyseur au reformeur | Clôturée | Gain en catégorie « Autres », équipe interservices |
| 030 | Purges du ballon d'air B-07 | Vérification du maintien | Équipe de 2 agents |
| 031 | Condensats de la ligne vapeur L-12 | Validation de clôture | Gains à valider par **controle2.demo** (réattribuée) |
| 032 | Démarrage difficile pompe P-650 | Ouvert | En **rédaction** par le pilote (sections 1 et 2) |

## 3. Les scénarios, dans l'ordre conseillé

Fil rouge : on suit la vie d'une fiche, du constat terrain jusqu'aux gains validés, en changeant de compte à chaque porte.

### Scénario 1 — L'agent déclare un problème (≈ 3 min)
**Compte : `agent.demo` / `Azerty123`**
1. Tableau de bord agent : mes fiches, mes actions, les notifications non lues.
2. Cliquer **Nouvelle fiche** : titre, unité DIST, équipement, origine, énoncé. Dans « Origine », ouvrir **Autre** : les options créées par d'autres utilisateurs y sont rangées (« Observation lors d'une ronde de nuit »). Taper une option proche d'une existante pour montrer la détection de doublon.
3. Enregistrer : la fiche est créée **sans pilote**, l'administrateur fonctionnel est notifié.
4. Ouvrir **A3-2026-006** : l'agent est membre de l'équipe, il a une action **en retard** et a reçu une **relance** du pilote.
5. **Fiches**, filtre Équipe → **Mes équipes** ; puis **Notifications** : l'invitation « … vous invite dans l'équipe de la fiche ».

### Scénario 2 — L'administrateur fonctionnel désigne le pilote (≈ 3 min)
**Compte : `admin-fonctionnel.demo`**
1. Tableau de bord admin : fiches **sans pilote** (A3-2026-009, 022 et celle créée au scénario 1).
2. Désigner `pilote.demo` comme pilote de la fiche créée à l'instant.
3. Montrer A3-2026-010 : **classée sans suite** comme doublon (motif visible).
4. Administration → **Utilisateurs** : comptes actifs, `ancien-agent.demo` désactivé, `ramatoulaye.sene` marqué annuaire.
5. **Créer un utilisateur** avec l'assistant : source **Annuaire** → chercher « Ramatoulaye » (déjà créé) puis « Modou » (nouveau) → rôle → affectation à une unité → récapitulatif. Montrer aussi la création d'un compte **local**.
6. **Circuit de validation** : domaine → directeurs (Fiabilité → Procédé + Maintenance, Intégrité → Procédé + Inspection, Sûreté/Cyber → Procédé + DSI).
7. **Droits des rôles** : quels rôles peuvent déclarer, commenter, relancer, mettre en attente, voir l'historique.
8. **Organigramme** : directions, départements, services, chefs de département.
9. **Référentiels** : les options rangées sous « Autre », avec leur auteur (AMDEC, Analyseur en ligne…).
10. **Journal d'administration** : créations, réattribution et partage de validations, modifications.

### Scénario 3 — Le pilote rédige et soumet (≈ 4 min)
**Compte : `pilote.demo`**
1. Tableau de bord pilote : fiches pilotées par étape, actions en retard, validations en attente.
2. Ouvrir **A3-2026-027** (équipe constituée) : onglet **Équipe**, ajouter un membre (agent ou pilote), montrer qu'un valideur ne peut pas être ajouté. L'historique montre l'ajout puis le retrait de `agent2.demo`.
3. Ouvrir **A3-2026-026** : sections 5 (causes, 5 Pourquoi), 6 (actions avec responsable, échéance, coût), 7 (domaines et risques avec MOC). Bouton **Soumettre le plan** (porte 1) : les directeurs du circuit reçoivent la demande en même temps.
4. Ouvrir **A3-2026-006** : onglet **Actions**, action réalisée avec preuve jointe, action en retard → **Relancer**.
5. Ouvrir **A3-2026-005** : objectif non atteint, **nouvelle boucle** (version 2), comparer les versions.
6. Ouvrir **A3-2026-004** : onglet contrôles J+30 / J+60 conformes, saisir J+90 puis **soumettre la clôture** (porte 2).
7. **Impression A3** d'une fiche clôturée (A3-2026-001 ou 024).

Variante `pilote2.demo` : A3-2026-016 (action **bloquée par le MOC**), A3-2026-017 (**en attente**, lever le blocage), A3-2026-014 (fiche **restreinte**, contrôle J+60 **non conforme** avec action corrective), A3-2026-015 (saisir les **mesures de résultats**), A3-2026-032 (rédaction en cours).

### Scénario 4 — Le chef de département valide la pertinence, porte 0 (≈ 2 min)
**Compte : `chef.demo`** (rôle donné par l'organigramme : responsable du Département Exploitation)
1. Tableau de bord : **A3-2026-028** à valider (fiche restreinte : visible car il est sollicité).
2. Choix possibles : **Valider**, **Renvoyer** (à refaire, comme A3-2026-008) ou **Classer sans suite**.
3. Valider : la fiche passe « En cours », le pilote est notifié.

Variante `chef2.demo` : **A3-2026-020** en attente et déjà **relancée** par le pilote ; A3-2026-021 classée sans suite par ce chef.

### Scénario 5 — Les directeurs valident le plan, porte 1 (≈ 3 min)
**Compte : `valideur.demo`** (Directeur Production)
1. Menu **Validations à traiter** : **A3-2026-007** à décider. Les autres directeurs sollicités (Procédé, DSI) sont visibles en parallèle.
2. Valider avec un commentaire : l'avancement de la porte se met à jour.

Puis **`valideur-procede.demo`** et **`valideur-dsi.demo`** valident aussi la 007 : la fiche passe en **Réalisation des actions**.

Autres cas :
- `valideur2.demo` et `valideur-hse2.demo` : **A3-2026-023** (QHSE).
- `valideur-procede2.demo` et `valideur-inspection2.demo` : **A3-2026-019** (la Production a déjà validé).
- Un refus : A3-2026-018 (plan refusé par le QHSE, commentaire du pilote en réponse).
- `valideur-maintenance.demo` : historique de ses validations sur les fiches Fiabilité clôturées.

### Scénario 6 — Le contrôle de gestion valide les gains, porte 2 (≈ 3 min)
**Compte : `controle.demo`**
1. Tableau de bord contrôle de gestion : gains à valider, montants, hypothèses de calcul.
2. Ouvrir **A3-2026-013** : section 9, gain « Révision lourde repoussée » (12,4 M FCFA). **Valider** ou **refuser** gain par gain, puis donner la décision de la porte.
3. Montrer que cette demande est **partagée** avec `controle2.demo` (congés de la titulaire).
4. Exemple de gain **refusé** : A3-2026-003 (« Fuel gaz économisé, estimation non mesurée »).

**Compte : `controle2.demo`**
- **A3-2026-031** : demande **réattribuée** (portefeuille Utilités), gain de 8,6 M FCFA à valider.
- Voit aussi A3-2026-013 grâce au partage.

### Scénario 7 — La direction approuve la clôture (≈ 2 min)
**Compte : `direction.demo`**
1. Tableau de bord direction : vue globale, gains cumulés, fiches par étape et par unité.
2. **A3-2026-003** : gains déjà décidés par le CG, **approuver la clôture** en tant que sponsor.
3. Montrer A3-2026-012 : clôture **refusée** par le sponsor (maintien prouvé sur deux mois seulement), renvoyée en vérification.
4. **Fiches** (registre) : filtres par étape, unité, statut ; export Excel.
5. **Leçons et standards** : leçons apprises des fiches clôturées.

Variante `direction2.demo` : sponsor de A3-2026-013 (après décision du CG).

### Scénario 8 — L'administrateur technique (≈ 1 min)
**Compte : `admin-technique.demo`**
- État technique, configuration du courriel, comptes : **sans accès au contenu des fiches** (séparation des rôles).

## 4. Points à mettre en avant

- **Confidentialité** : A3-2026-014 et 028 sont restreintes. Se connecter avec `agent.demo` : elles n'apparaissent pas dans son registre.
- **Historique lisible** : onglet Historique de A3-2026-001 (déclaration → clôture, chaque décision horodatée).
- **Échanges** : commentaires sur la fiche, sur les actions et en réponse aux refus.
- **Pièces jointes** : comptes rendus PDF sur les actions réalisées, preuves de pérennisation, photo du constat.
- **Notifications** : les plus récentes sont non lues, les plus anciennes déjà lues.
- **Rappels automatiques** : `php artisan a3:relances` génère les rappels des actions en retard et des validations en attente.

## 5. En cas de souci pendant la démo

- Une action de démo a cassé le scénario suivant : `php artisan migrate:fresh --seed` (≈ 40 s) et recommencer.
- Mot de passe refusé : vérifier `Azerty123` (majuscule A) et que le compte n'est pas `ancien-agent.demo` ou `ramatoulaye.sene`.
- Fiche introuvable : vérifier le **profil actif** (un compte avec plusieurs affectations choisit son profil en haut de l'écran).
