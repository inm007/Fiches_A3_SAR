# SAR — Backend Fiche A3

API Laravel de l'application P13 de numérisation de la fiche A3 d'amélioration continue de la SAR. Elle porte toutes les règles métier : authentification, droits, workflow, validations, contrôles d'efficacité, gains, historique et notifications. Le frontend React ne fait qu'afficher et saisir.

## Prérequis
| PHP | 8.5.12 ou plus récent (minimum 8.4.27 en 8.4), extensions `pdo_pgsql`, `mbstring`, `openssl` |
| Composer | 2.x |
| PostgreSQL | 18.6 |
| Laravel | 13.35 |

## Installation

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Renseigner la base dans `.env` :

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=fiche_a3
DB_USERNAME=postgres
DB_PASSWORD=          # jamais commité
```

Puis créer la base et les données :

```bash
php artisan migrate --seed
php artisan serve            # http://127.0.0.1:8000
```

## Données

Mot de passe de tous les comptes de démonstration : `Azerty123` (exemples : `agent.demo`, `pilote.demo`, `valideur-hse.demo`, `direction.demo`, `admin-fonctionnel.demo`).

Pour repartir de zéro :

```bash
php artisan migrate:fresh --seed   
```


## Tests

Les tests tournent sur PostgreSQL (la base de `.env`) et isolent leurs écritures dans des transactions.

```bash
php artisan test --compact
php artisan test --compact --filter=ReglesMetierTest
```