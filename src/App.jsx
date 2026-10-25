import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SiteSelect from './pages/SiteSelect'
import Capture from './pages/Capture'
import VehicleDetail from './pages/VehicleDetail'
import ShareView from './pages/ShareView'
import SiteLayout from './layouts/SiteLayout'
import SiteOverview from './pages/site/SiteOverview'
import SiteVehicles from './pages/site/SiteVehicles'
import SitePhotos from './pages/site/SitePhotos'
import SiteDocuments from './pages/site/SiteDocuments'
import SiteNotes from './pages/site/SiteNotes'
import VehicleHistory from './pages/site/VehicleHistory'

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<ShareView />} />

      {/* Home = Site Selection */}
      <Route path="/" element={<SiteSelect />} />

      {/* Site-scoped routes */}
      <Route path="/site/:siteId" element={<SiteLayout />}>
        <Route index element={<SiteOverview />} />
        <Route path="capture" element={<Capture />} />
        <Route path="vehicles" element={<SiteVehicles />} />
        <Route path="vehicles/history" element={<VehicleHistory />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="photos" element={<SitePhotos />} />
        <Route path="documents" element={<SiteDocuments />} />
        <Route path="notes" element={<SiteNotes />} />
      </Route>
    </Routes>
  )
}
