import EmptyState from './EmptyState.jsx'
import './PagePlaceholder.css'

function PagePlaceholder({ title, description, pageClass = '' }) {
  return (
    <section className={`page-placeholder ${pageClass}`.trim()}>
      <header className="page-placeholder__header">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="page-placeholder__surface">
        <EmptyState title="Structure prête à compléter" description="Le contenu métier de cette page sera ajouté dans une étape suivante." />
      </div>
    </section>
  )
}

export default PagePlaceholder
