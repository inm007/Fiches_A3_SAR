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
| SMTP et état technique | `admin-technique.demo` |

La base de démonstration contient 15 fiches, une par étape du parcours.

## Pièces jointes

Le pilote désigné peut ajouter des fichiers à sa fiche. Un agent peut en ajouter uniquement à une action dont il est responsable. Les profils autorisés à consulter la fiche peuvent télécharger les pièces jointes ; les fichiers sont conservés sur le disque privé du serveur, sans URL publique.

Formats acceptés : PDF, PNG, JPEG, DOCX, XLSX et PPTX. La taille maximale par fichier et le nombre maximal de fichiers par fiche se règlent dans **Administration fonctionnelle → Paramètres fonctionnels** (10 Mo et 20 fichiers par défaut).

## Vérifier

```bash
cd backend && php artisan test --compact
cd frontend && npm run lint && npm run build
```
