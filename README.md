# Fiche A3 numérique SAR

Outil de suivi des fiches A3 d'amélioration continue de la SAR : déclaration d'un problème, analyse en 12 sections, plan d'actions validé en deux portes, contrôles d'efficacité à J+30, J+60 et J+90, gains en FCFA et historique immuable.


## Démarrage rapide

Prérequis : PHP 8.3+, Composer, PostgreSQL, Node.js.

```bash
# 1. Backend
cd backend
composer install
cp .env.example .env          # renseigner DB_DATABASE, DB_USERNAME, DB_PASSWORD
php artisan key:generate
php artisan migrate --seed    # schéma, référentiels, comptes et fiches de démonstration
php artisan serve             # http://127.0.0.1:8000

# 2. Frontend (autre terminal)
cd frontend
npm install
npm run dev                   # http://127.0.0.1:5173
```

Ouvrir http://127.0.0.1:5173 et se connecter avec un compte de démonstration, mot de passe `Azerty123` :

| Déclarer une fiche | `agent.demo` |
| Compléter une fiche, soumettre le plan et la clôture | `pilote.demo` |
| Valider un plan | `valideur.demo`, `valideur-hse.demo` |
| Valider les gains | `controle.demo` |
| Approuver la clôture, vue globale | `direction.demo` |
| Comptes, affectations, référentiels, désignation du pilote | `admin-fonctionnel.demo` |
| État technique et journal d'administration | `admin-technique.demo` |

La base de démonstration contient 15 fiches, une par étape du parcours.

## Mettre à jour une base existante

Les migrations de création ont été réécrites (colonnes fusionnées, tables inutilisées retirées, contraintes des catégories de gain et des types de pérennisation supprimées). Une base créée avec une version précédente doit être recréée :

```bash
cd backend
php artisan migrate:fresh --seed   # efface toutes les données puis recharge la démonstration
```

Le serveur de courriel se configure uniquement dans `backend/.env` (voir « Brancher l'annuaire, SAP et le courriel »).

## Relances et rappels

Tous les rappels arrivent dans les notifications (cloche et page Notifications).

- **Manuels** : bouton « Relancer » sur une action en retard (onglet Actions) ou une validation en attente (onglet Validations), pour le pilote de la fiche, la Direction et l'administrateur fonctionnel. Une relance au plus par 24 h et par élément.
- **Automatiques** : la commande `a3:relances` part chaque jour à 07:00. Elle envoie :
  - au responsable, un rappel quand l'échéance de son action approche (3 jours avant par défaut, une fois par échéance) ;
  - au responsable, avec copie au pilote, un rappel d'action en retard dès le lendemain de l'échéance, puis à chaque délai ;
  - au valideur, un rappel de validation en attente après le délai, puis à chaque délai ;
  - au pilote, une notification quand un contrôle J+30, J+60 ou J+90 devient disponible.
- Le délai (7 jours par défaut), le préavis d'échéance et l'activation des rappels de validation se règlent dans **Administration fonctionnelle → Paramètres fonctionnels**.
- Le responsable d'une action est aussi prévenu quand le plan est validé, quand une action lui est attribuée ou réattribuée et quand son échéance est reportée.

Le planificateur Laravel doit tourner pour que les rappels automatiques partent :

```bash
cd backend
php artisan schedule:work          # en développement, laisser tourner dans un terminal
php artisan a3:relances            # lancer les rappels à la main
```

En production, ajouter une seule ligne au cron du serveur :

```
* * * * * cd /chemin/vers/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Suivi d'une fiche dans la durée

- **Changer le pilote** : l'administrateur fonctionnel change le pilote à toute étape avant la clôture (bouton « Changer le pilote » sur la fiche ou « Gérer » dans le registre). Après l'étape Ouvert, un motif est demandé et inscrit dans l'historique ; l'ancien et le nouveau pilote sont prévenus.
- **Replanifier une action** : pendant la réalisation, le pilote reporte une échéance ou change le responsable d'une action non terminée (bouton « Replanifier », motif obligatoire). Le plan validé n'est pas remis en circuit de validation.
- **Ajouter une action** : pendant la réalisation, le pilote ajoute une action oubliée, rattachée à une cause (bouton « Ajouter une action », motif obligatoire).
- **Partager la fiche** : quand le pilote est malade, en congé ou a besoin de renfort, l'administrateur fonctionnel associe un second pilote de l'unité (« Partager la fiche », motif obligatoire). Les deux pilotes voient la fiche et ce que l'autre a fait (historique, dernier enregistrement de chaque section) et la poursuivent ensemble ; le partage se retire au retour du pilote. « Changer le pilote » reste réservé à un départ définitif.
- **Partager une validation** : si un valideur est absent, désactivé ou n'a plus son affectation, l'administrateur fonctionnel associe un autre titulaire du même rôle à la demande (« Partager une validation »). Les deux la voient, le premier qui décide la traite et signe. Les demandes bloquées apparaissent dans « À régulariser » sur son tableau de bord.
- **Historique d'un équipement** : le registre filtre et recherche par équipement ; le lien « historique » à côté de l'équipement d'une fiche ouvre toutes les fiches visibles sur cet équipement.

## Tableau de bord

Les indicateurs annuels (taux et délai de clôture, gains validés, gain net annuel validé) portent sur l'année choisie dans le cadre « Gain net annuel validé », l'année en cours par défaut : la consolidation de l'année écoulée reste consultable après le 1er janvier. La Direction voit aussi la part des fiches avec vérification d'efficacité renseignée (fiches mesurées dont aucun contrôle échu ne reste à renseigner) et la répartition des fiches par unité, type d'amélioration et origine.

## Listes et commentaires

Les catégories de gain (section 9) et les types de pérennisation (section 10) se gèrent dans **Administration fonctionnelle → Listes**, comme les origines ou les types d'action.

Dans l'onglet Commentaires, le champ « À propos de » rattache un commentaire à la fiche, à une action ou à une validation ; l'élément visé s'affiche en étiquette.

## Pièces jointes

Le pilote désigné peut ajouter des fichiers à sa fiche. Un agent peut en ajouter uniquement à une action dont il est responsable. Les profils autorisés à consulter la fiche peuvent télécharger les pièces jointes ; les fichiers sont conservés sur le disque privé du serveur, sans URL publique.

Formats acceptés : PDF, PNG, JPEG, DOCX, XLSX et PPTX. La taille maximale par fichier et le nombre maximal de fichiers par fiche se règlent dans **Administration fonctionnelle → Paramètres fonctionnels** (10 Mo et 20 fichiers par défaut).

## Brancher l'annuaire, SAP et le courriel

Ces raccordements se font par configuration, dans `backend/.env`, sans toucher au code métier :

| Raccordement | Variables | État livré |
|---|---|---|
| Annuaire LDAP | `AUTH_PROVIDER=ldap` | `local` : connexion par identifiant et mot de passe. Les comptes portent déjà `auth_source` et `ldap_dn`. |
| SAP (lecture) | `SAP_ENABLED=true` | `false` : les références SAP (équipement, avis, ordre) sont saisies à la main. |
| Serveur de courriel | `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` | `log` : les liens de mot de passe sont écrits dans `storage/logs`. |

En production, passer aussi `APP_DEBUG=false` et `APP_ENV=production`, sinon une erreur affiche les chemins et la pile d'appels.

## Vérifier

```bash
cd backend && php artisan test --compact && vendor/bin/pint --test
cd frontend && npm run lint && npm test && npm run build
```

Un guide d'utilisation par profil est dans [`docs/guide-utilisateur.md`](docs/guide-utilisateur.md).
