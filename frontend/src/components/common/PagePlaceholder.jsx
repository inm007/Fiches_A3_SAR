import EmptyState from './EmptyState.jsx'
import PageBanner from './PageBanner.jsx'
import './PagePlaceholder.css'

function PagePlaceholder({ title, description, pageClass = '' }) {
  return (
    <section className={`page-placeholder ${pageClass}`.trim()}>
      <PageBanner description={description} title={title} />
      <div className="page-placeholder__surface">
        <EmptyState title="Structure prête à compléter" description="Le contenu métier de cette page sera ajouté dans une étape suivante." />
      </div>
    </section>
  )
}

export default PagePlaceholder
