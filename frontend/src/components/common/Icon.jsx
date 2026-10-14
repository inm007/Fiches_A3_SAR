// Icônes au trait de la maquette « SAR · Fiches A3 — Démo » (20 px, contour).
const paths = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  plus: 'M12 5v14M5 12h14',
  ok: 'M5 12l5 5 9-10',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  clock: 'M12 7v5l3 2M3 12a9 9 0 1018 0 9 9 0 10-18 0',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-4 3-6 6-6s6 2 6 6M17 8a3 3 0 010 6M21 20c0-3-2-5-4-5.5',
  set: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  x: 'M6 6l12 12M18 6L6 18',
  al: 'M12 4l9 16H3zM12 10v4M12 17v1',
  pdf: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  logout: 'M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  assignments: 'M9 5h6M9 3h6v4H9zM6 5H4v16h16V5h-2M8 12h8M8 16h6',
  unit: 'M3 21h18M5 21V5l7-3 7 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  equipment: 'M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3zM18 3l3 3-3 3',
  lists: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  technical: 'M12 8v4l3 2M4.93 4.93a10 10 0 1 0 14.14 0 10 10 0 0 0-14.14 0',
}

function Icon({ name, size = 20, className = '' }) {
  return (
    <svg aria-hidden="true" className={`sar-icon ${className}`.trim()} height={size} viewBox="0 0 24 24" width={size}>
      <path d={paths[name]} />
    </svg>
  )
}

export default Icon
