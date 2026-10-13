import './Skeleton.css'

function Skeleton({ width = '100%', height = 18 }) {
  return <span aria-hidden="true" className="sar-skeleton" style={{ width, height }} />
}

export default Skeleton
