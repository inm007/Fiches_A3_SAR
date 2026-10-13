import PagePlaceholder from '../../components/common/PagePlaceholder.jsx'
import './NotFound.css'

function NotFound() {
  return <PagePlaceholder pageClass="not-found-page" title="Page introuvable" description="La page demandée n’existe pas ou n’est pas accessible." />
}

export default NotFound
