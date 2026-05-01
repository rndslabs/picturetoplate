import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './styles/brand.css'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import AuthCallback from './pages/AuthCallback'
import IngredientInput from './pages/IngredientInput'
import RequireAuth from './components/RequireAuth'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Navigate to="/signin" replace />} />
        <Route path="/signin"        element={<SignIn />} />
        <Route path="/signup"        element={<SignUp />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app"           element={<RequireAuth><IngredientInput /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
