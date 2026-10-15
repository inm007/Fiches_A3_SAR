import './PageBanner.css'

function PageBanner({ title, description, actions, className = '' }) {
  return (
    <header className={['sar-page-banner', className].filter(Boolean).join(' ')}>
      <div className="sar-page-banner__content">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="sar-page-banner__actions">{actions}</div>}
    </header>
  )
}

export default PageBanner
