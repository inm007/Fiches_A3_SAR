import { BRAND_LINES } from './brand.js'

/** Accroche statique (pages mot de passe), même rendu que la connexion une fois l'animation finie. */
function BrandSlogan() {
  return (
    <>
      <span aria-hidden="true" className="login-page__typewriter">
        {BRAND_LINES.map((line, index) => (
          <span className={`login-page__typewriter-line${index === BRAND_LINES.length - 1 ? ' is-highlighted' : ''}`} key={line}>{line}</span>
        ))}
      </span>
      <span aria-hidden="true" className="login-page__mobile-slogan">Jusqu’à la preuve des résultats.</span>
    </>
  )
}

export default BrandSlogan
