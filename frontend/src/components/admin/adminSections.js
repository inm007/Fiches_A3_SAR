// Les neuf écrans d'administration, regroupés en quatre entrées de menu. Chaque écran garde son adresse.
export const ADMIN_SECTIONS = [
  {
    label: 'Utilisateurs et rôles',
    icon: 'users',
    pages: [
      { label: 'Utilisateurs', to: '/admin/utilisateurs' },
      { label: 'Affectations', to: '/admin/affectations' },
      { label: 'Droits des rôles', to: '/admin/droits' },
    ],
  },
  {
    label: 'Organisation',
    icon: 'org',
    pages: [
      { label: 'Organigramme', to: '/admin/organigramme' },
      { label: 'Unités', to: '/admin/unites' },
      { label: 'Équipements', to: '/admin/equipements' },
    ],
  },
  {
    label: 'Circuit de validation',
    icon: 'circuit',
    pages: [{ label: 'Circuit de validation', to: '/admin/circuit' }],
  },
  {
    label: 'Réglages',
    icon: 'settings',
    pages: [
      { label: 'Listes de choix', to: '/admin/listes' },
      { label: 'Paramètres', to: '/admin/parametres-fonctionnels' },
    ],
  },
]

export const sectionOf = (pathname) => ADMIN_SECTIONS.find((section) => section.pages.some((page) => page.to === pathname))
