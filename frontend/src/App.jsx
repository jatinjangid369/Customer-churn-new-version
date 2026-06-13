import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Brain, Upload as UploadIcon,
  BarChart3, Zap, Settings
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Predict from './pages/Predict'
import Upload from './pages/Upload'
import FeatureMapping from './pages/FeatureMapping'
import Training from './pages/Training'
import TrainingProgress from './pages/TrainingProgress'
import Predictions from './pages/Predictions'
import Models from './pages/Models'

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🧠</div>
          <div>
            <div className="logo-text">ChurnIQ</div>
            <div className="logo-sub">Intelligence Platform</div>
          </div>
        </div>
      </div>

      <div className="nav-section-label">Analytics</div>
      <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <LayoutDashboard size={16} /> Dashboard
      </NavLink>
      <NavLink to="/customers" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <Users size={16} /> Customers
      </NavLink>

      <div className="nav-section-label">ML Workflow</div>
      <NavLink to="/upload" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <UploadIcon size={16} /> Upload Data
      </NavLink>
      <NavLink to="/models" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <BarChart3 size={16} /> Models
      </NavLink>

      <div className="nav-section-label">Tools</div>
      <NavLink to="/predict" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <Brain size={16} /> Single Prediction
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/feature-mapping/:datasetId" element={<FeatureMapping />} />
            <Route path="/training/:featureMappingId" element={<Training />} />
            <Route path="/training-progress/:jobId" element={<TrainingProgress />} />
            <Route path="/predictions/:jobId" element={<Predictions />} />
            <Route path="/models" element={<Models />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
