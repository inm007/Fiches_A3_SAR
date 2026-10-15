import Spinner from '../ui/Spinner.jsx'
import './PageLoader.css'

/** Chargement d'une page ou de la session : spinner centré avec libellé. */
function PageLoader({ label = 'Chargement…', fullScreen = false }) {
  return (
    <div aria-busy="true" className={`page-loader${fullScreen ? ' page-loader--full' : ''}`} role="status">
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  )
}

export default PageLoader
