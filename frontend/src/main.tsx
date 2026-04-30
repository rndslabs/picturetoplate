import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/brand.css'
import IngredientInput from './pages/IngredientInput'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IngredientInput />
  </React.StrictMode>,
)
