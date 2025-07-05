import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthenticatedApp } from './components/AuthenticatedApp'
import './styles/auth.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthenticatedApp />
  </React.StrictMode>
)