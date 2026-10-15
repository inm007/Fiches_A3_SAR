// Jeu d'icônes unique de l'application : tracés au trait de la maquette « SAR · Fiches A3 — Démo »
// (24 × 24, contour). Ajouter ici toute nouvelle icône, jamais de SVG recopié dans un composant.
const paths = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  plus: 'M12 5v14M5 12h14',
  ok: 'M5 12l5 5 9-10',
  bell: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  clock: 'M12 7v5l3 2M3 12a9 9 0 1018 0 9 9 0 10-18 0',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  set: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  x: 'M6 6l12 12M18 6L6 18',
  al: 'M12 4l9 16H3zM12 10v4M12 17v1',
  info: 'M12 11v6M12 7h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
  pdf: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  logout: 'M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M18 13l-6 6-6-6',
  'page-first': 'M6 5v14M19 6l-6 6 6 6',
  'page-previous': 'M15 6l-6 6 6 6',
  'page-next': 'M9 6l6 6-6 6',
  'page-last': 'M18 5v14M5 6l6 6-6 6',
  assignments: 'M9 5h6M9 3h6v4H9zM6 5H4v16h16V5h-2M8 12h8M8 16h6',
  unit: 'M3 21h18M5 21V5l7-3 7 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  equipment: 'M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3zM18 3l3 3-3 3',
  lists: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  technical: 'M12 8v4l3 2M4.93 4.93a10 10 0 1 0 14.14 0 10 10 0 0 0-14.14 0',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4z',
  mail: 'M4 5h16v14H4zM4 7l8 6 8-6',
  disable: 'M8 11V7a4 4 0 018 0v4M6 11h12v9H6zM4 4l16 16',
  enable: 'M6 11h12v9H6zM8 11V7a4 4 0 018 0',
  dashboard: 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6',
  files: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  validation: 'M5 12l4 4L19 6M4 4h5M4 20h5',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.09-.02a1.7 1.7 0 0 0-1.72.75l-.05.08h-3.4l-.04-.09a1.7 1.7 0 0 0-1.52-1.02h-.1l-1.7-2.94.06-.07a1.7 1.7 0 0 0 .35-1.67l-.03-.1-2.94-1.7.02-.09a1.7 1.7 0 0 0-.75-1.72l-.08-.05V7.9l.09-.04a1.7 1.7 0 0 0 1.02-1.52v-.1l2.94-1.7.07.06a1.7 1.7 0 0 0 1.67.35l.1-.03 1.7-2.94.09.02a1.7 1.7 0 0 0 1.72-.75l.05-.08h3.4l.04.09a1.7 1.7 0 0 0 1.52 1.02h.1l1.7 2.94-.06.07a1.7 1.7 0 0 0-.35 1.67l.03.1 2.94 1.7-.02.09a1.7 1.7 0 0 0 .75 1.72l.08.05v3.4l-.09.04a1.7 1.7 0 0 0-1.02 1.52v.1z',
  user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21a8 8 0 0116 0',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 100 6 3 3 0 000-6z',
  'eye-off': 'M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
}

function Icon({ name, size = 20, className = '' }) {
  return (
    <svg aria-hidden="true" className={`sar-icon ${className}`.trim()} height={size} viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  )
}

export default Icon
