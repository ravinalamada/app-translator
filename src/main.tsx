import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {AppTranslator} from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppTranslator />
  </StrictMode>,
)
