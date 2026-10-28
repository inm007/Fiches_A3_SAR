# Fiche A3 numérique SAR

Outil de suivi des fiches A3 d'amélioration continue de la SAR : déclaration d'un problème, analyse en 12 sections, validation en trois portes (pertinence, plan, clôture), contrôles d'efficacité à J+30, J+60 et J+90, gains en FCFA et historique immuable.


## Démarrage rapide

Prérequis : PHP 8.5.12+ (ou 8.4.27+), Composer, PostgreSQL, Node.js.

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

| Pour… | Compte |
|---|---|
| Déclarer une fiche | `agent.demo` |
| Compléter une fiche, soumettre le plan et la clôture | `pilote.demo` |
| Valider la pertinence (porte 0) | `chef.demo` |
| Valider un plan (porte 1) | `valideur.demo`, `valideur-hse.demo` |
| Valider les gains | `controle.demo` |
| Approuver la clôture, vue globale | `direction.demo` |
| Comptes, affectations, référentiels, désignation du pilote | `admin-fonctionnel.demo` |
| État technique et journal d'administration | `admin-technique.demo` |

La base de démonstration contient 30 fiches, qui couvrent toutes les étapes du parcours.

## Mettre à jour une base existante

Les migrations de création ont été réécrites (colonnes fusionnées, tables inutilisées retirées, contraintes des catégories de gain et des types de pérennisation supprimées, gain net et délai de retour ajoutés à la fiche). Une base créée avec une version précédente doit être recréée :

```bash
cd backend
php artisan migrate:fresh --seed   # efface toutes les données puis recharge la démonstration
```

Le serveur de courriel se configure uniquement dans `backend/.env` (voir « Brancher l'annuaire, SAP et le courriel »).

## Planificateur des rappels

Le planificateur Laravel doit tourner pour que les rappels automatiques partent (leur contenu est décrit dans `DOCUMENTATION.md`, section 11) :

```bash
cd backend
php artisan schedule:work          # en développement, laisser tourner dans un terminal
php artisan a3:relances            # lancer les rappels à la main
```

En production, ajouter une seule ligne au cron du serveur :

```
* * * * * cd /chemin/vers/backend && php artisan schedule:run >> /dev/null 2>&1
```

## Brancher l'annuaire, SAP et le courriel

Ces raccordements se font par configuration, dans `backend/.env`, sans toucher au code métier :

| Raccordement | Variables | État livré |
|---|---|---|
| Annuaire LDAP | `AUTH_PROVIDER=ldap` | `local` : connexion par identifiant et mot de passe. Les comptes portent déjà `auth_source` et `ldap_dn`. |
| SAP (lecture) | `SAP_ENABLED=true` | `false` : les références SAP (équipement, avis, ordre) sont saisies à la main. |
| Serveur de courriel | `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` ; `APP_NAME` donne le nom de l'expéditeur | `log` : les liens de mot de passe sont écrits dans `storage/logs`. |

En production, passer aussi `APP_DEBUG=false` et `APP_ENV=production`, sinon une erreur affiche les chemins et la pile d'appels.

## Vérifier

```bash
cd backend && php artisan test --compact && vendor/bin/pint --test
cd frontend && npm run lint && npm test && npm run build
```

## Documentation

- [`DOCUMENTATION.md`](DOCUMENTATION.md) : tout ce que fait l'application (parcours, règles, droits, relances, tableaux de bord, administration, API).
- [`docs/guide-utilisateur.md`](docs/guide-utilisateur.md) : mode d'emploi court, profil par profil.
- [`docs/memoire_implementation_p13.md`](docs/memoire_implementation_p13.md) : mémoire d'implémentation du projet.
- [`docs/plan/`](docs/plan) : cahier des charges (PRD, TRD, spécification de la base, maquettes UX/UI, plan d'implémentation).
