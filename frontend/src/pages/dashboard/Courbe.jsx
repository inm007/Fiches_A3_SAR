import { useState } from 'react'

// Courbe mois par mois, en SVG simple : une ou deux séries de même unité (jamais deux échelles),
// valeur au bout de chaque ligne, info-bulle au survol et tableau équivalent pour les lecteurs d'écran.

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const W = 640
const H = 220
const PAD = { top: 16, right: 64, bottom: 28, left: 44 }

function arrondiHaut(max) {
  if (max <= 4) return 4
  const pas = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / pas) * pas
}

/**
 * @param {{ data: object[], series: { key: string, label: string, couleur: string }[], format?: (n: number) => string, titre: string }} props
 */
function Courbe({ data, series, format = (n) => String(n), titre }) {
  const [survol, setSurvol] = useState(null)
  if (!data?.length) return null

  const max = arrondiHaut(Math.max(1, ...data.flatMap((ligne) => series.map((serie) => ligne[serie.key]))))
  const largeur = W - PAD.left - PAD.right
  const hauteur = H - PAD.top - PAD.bottom
  const x = (index) => PAD.left + (data.length === 1 ? largeur / 2 : (index * largeur) / (data.length - 1))
  const y = (valeur) => PAD.top + hauteur - (valeur / max) * hauteur
  const graduations = [0, max / 2, max]
  const pas = data.length > 1 ? largeur / (data.length - 1) : largeur

  return (
    <figure className="dash-courbe">
      {series.length > 1 && (
        <figcaption className="dash-courbe__legende">
          {series.map((serie) => (
            <span key={serie.key}><i aria-hidden="true" style={{ background: serie.couleur }} />{serie.label}</span>
          ))}
        </figcaption>
      )}
      <div className="dash-courbe__zone">
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`}>
          {graduations.map((valeur) => (
            <g key={valeur}>
              <line className="dash-courbe__grille" x1={PAD.left} x2={W - PAD.right} y1={y(valeur)} y2={y(valeur)} />
              <text className="dash-courbe__axe" textAnchor="end" x={PAD.left - 8} y={y(valeur) + 4}>{format(valeur)}</text>
            </g>
          ))}
          {data.map((ligne, index) => (
            <text className="dash-courbe__axe" key={ligne.mois} textAnchor="middle" x={x(index)} y={H - 8}>{MOIS[ligne.mois - 1]}</text>
          ))}
          {survol !== null && <line className="dash-courbe__repere" x1={x(survol)} x2={x(survol)} y1={PAD.top} y2={PAD.top + hauteur} />}
          {series.map((serie) => {
            const points = data.map((ligne, index) => `${x(index)},${y(ligne[serie.key])}`).join(' ')
            const dernier = data[data.length - 1][serie.key]
            return (
              <g key={serie.key}>
                <polyline fill="none" points={points} stroke={serie.couleur} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {survol !== null && <circle className="dash-courbe__point" cx={x(survol)} cy={y(data[survol][serie.key])} fill={serie.couleur} r="4" />}
                <text className="dash-courbe__fin" x={x(data.length - 1) + 8} y={y(dernier) + 4}>{format(dernier)}</text>
              </g>
            )
          })}
          {data.map((ligne, index) => (
            <rect
              fill="transparent"
              height={hauteur}
              key={ligne.mois}
              width={pas}
              x={x(index) - pas / 2}
              y={PAD.top}
              onMouseEnter={() => setSurvol(index)}
              onMouseLeave={() => setSurvol(null)}
            />
          ))}
        </svg>
        {survol !== null && (
          <div className="dash-courbe__bulle" style={{ left: `${(x(survol) / W) * 100}%` }}>
            <strong>{MOIS[data[survol].mois - 1]}</strong>
            {series.map((serie) => (
              <span key={serie.key}><i aria-hidden="true" style={{ background: serie.couleur }} />{serie.label} : {format(data[survol][serie.key])}</span>
            ))}
          </div>
        )}
      </div>
      <table className="sar-sr-only">
        <caption>{titre}</caption>
        <thead><tr><th scope="col">Mois</th>{series.map((serie) => <th key={serie.key} scope="col">{serie.label}</th>)}</tr></thead>
        <tbody>
          {data.map((ligne) => (
            <tr key={ligne.mois}><th scope="row">{MOIS[ligne.mois - 1]}</th>{series.map((serie) => <td key={serie.key}>{format(ligne[serie.key])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default Courbe
