import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Transactor from './pages/Transactor.jsx'
import Admin from './pages/Admin.jsx'
import Banker from './pages/Banker.jsx'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2 mr-6">
            <span className="text-2xl">🛡️</span>
            <span className="font-bold text-lg text-blue-400 tracking-wide">FraudGuard</span>
          </div>
          <NavLink
            to="/transactor"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`
            }
          >
            💳 Transactor
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`
            }
          >
            ⚙️ Admin Pipeline
          </NavLink>
          <NavLink
            to="/banker"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`
            }
          >
            🏦 Banker View
          </NavLink>
        </div>
      </nav>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/transactor" replace />} />
          <Route path="/transactor" element={<Transactor />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/banker" element={<Banker />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
