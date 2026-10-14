import { SECTIONS } from '../../utils/constants.js'
import './A3Sheet.css'

// La fiche A3 telle qu'elle est imprimée : paysage 420 × 297, les sections 1 à 6 à gauche
// (comprendre et planifier), 7 à 12 à droite (agir, mesurer, pérenniser), cartouche en bas.
function A3Sheet() {
  const colonnes = [SECTIONS.slice(0, 6), SECTIONS.slice(6)]

  return (
    <figure aria-label="Fiche A3 en 12 sections" className="a3-sheet">
      <div className="a3-sheet__paper">
        <header className="a3-sheet__head">
          <span>Fiche A3 — résolution de problème</span>
          <span>Rév. 1</span>
        </header>
        <div className="a3-sheet__body">
          {colonnes.map((colonne, indexColonne) => (
            <ol className="a3-sheet__col" key={indexColonne} start={indexColonne * 6 + 1}>
              {colonne.map((section, index) => {
                const numero = indexColonne * 6 + index + 1
                return (
                  <li className="a3-sheet__cell" key={section} style={{ '--i': numero }}>
                    <span className="a3-sheet__num">{String(numero).padStart(2, '0')}</span>
                    <span className="a3-sheet__name">{section}</span>
                  </li>
                )
              })}
            </ol>
          ))}
        </div>
        <footer className="a3-sheet__block">
          <span><small>N°</small>A3-AAAA-NNN</span>
          <span><small>Unité</small>—</span>
          <span><small>Pilote</small>—</span>
          <span><small>Format</small>A3 · 420 × 297</span>
        </footer>
      </div>
      <figcaption className="a3-sheet__caption">Une page, douze sections, de la déclaration à la clôture.</figcaption>
    </figure>
  )
}

export default A3Sheet
