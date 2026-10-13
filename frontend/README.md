# SAR — Frontend Fiche A3

Frontend React/Vite de l’application SAR P13. Les routes, pages et composants partagés
sont actuellement des squelettes d’interface ; les règles métier et les appels API restent
à implémenter.

## Développement

Depuis ce dossier :

```sh
npm install
npm run dev
```

Vérification de production et lint :

```sh
npm run build
npm run lint
```

## Routes préparées

- `src/pages/auth/` : connexion, inscription de développement, oubli et réinitialisation du mot de passe
- `src/pages/dashboard/` : tableau de bord
- `src/pages/fiches/` : registre, nouvelle fiche et détail
- `src/pages/workflow/` : validations et notifications
- `src/pages/admin/` : utilisateurs, affectations, unités, équipements, listes et paramètres
- `src/pages/system/` : état technique, accès refusé et page introuvable

Chaque page JSX possède son fichier CSS voisin. Les styles et éléments communs aux pages
restent dans `src/components/common/` ou `src/components/layout/`.

Les composants qui portent leur propre présentation importent également leur CSS voisin.
Les composants de délégation (sections et onglets de la fiche) réutilisent le composant
visuel partagé, afin d’éviter de dupliquer les mêmes règles CSS.

La route de développement `/inscription` est désactivée par défaut ; elle peut être
affichée localement avec `VITE_ENABLE_DEV_REGISTER=true` et devra être retirée avant la
livraison.
