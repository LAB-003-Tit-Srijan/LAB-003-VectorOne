import { createRoot } from 'react-dom/client'
import './instrument'
import './index.css'
import App from './App.tsx'

// FIX: Removed <StrictMode> so react-player can mount successfully
createRoot(document.getElementById('root')!).render(
  <App />
)