import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'
import { warmUp } from './api/warmUp.ts'

// Outside React, so it runs once per page load even under StrictMode.
warmUp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
