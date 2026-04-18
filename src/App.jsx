import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import Zones from './pages/Zones'
import Checklists from './pages/Checklists'
import Reports from './pages/Reports'
import Team from './pages/Team'
import Issues from './pages/Issues'
import ShareView from './pages/ShareView'
import AppLayout from './layouts/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<ShareView />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/checklists" element={<Checklists />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/team" element={<Team />} />
        <Route path="/issues" element={<Issues />} />
      </Route>
    </Routes>
  )
}
