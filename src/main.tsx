import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
const Page = pathname === '/editor' ? App : pathname === '/login' ? LoginPage : HomePage

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
