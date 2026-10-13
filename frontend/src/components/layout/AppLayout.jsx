import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import './AppLayout.css'

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__workspace">
        <Topbar />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
