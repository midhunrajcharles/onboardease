import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import LoginPage   from './pages/LoginPage'
import SetupPage   from './pages/SetupPage'
import NewHirePage from './pages/NewHirePage'
import MentorPage  from './pages/MentorPage'
import AdminPage   from './pages/AdminPage'
import HRPage      from './pages/HRPage'

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/"                    element={<LandingPage />} />
          <Route path="/login"               element={<LoginPage />} />
          <Route path="/setup"               element={<SetupPage />} />
          {/* UUID-based routes — every user identity is embedded in the URL */}
          <Route path="/new-hire/:employeeId" element={<NewHirePage />} />
          <Route path="/new-hire"             element={<Navigate to="/login" replace />} />
          <Route path="/mentor/:mentorId"     element={<MentorPage />} />
          <Route path="/mentor"               element={<Navigate to="/login" replace />} />
          <Route path="/admin/:adminId"       element={<AdminPage />} />
          <Route path="/admin"                element={<Navigate to="/login" replace />} />
          <Route path="/hr/:hrId"             element={<HRPage />} />
          <Route path="/hr"                   element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  )
}

export default App
