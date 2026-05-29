import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { RoleProvider } from './context/RoleContext'
import { CampusProvider } from './context/CampusContext'
import { AccountingProvider } from './context/AccountingContext'
import { PackageProvider } from './context/PackageContext'
import { ErrorBoundary } from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>
            <DataProvider>
              <PackageProvider>
                <CampusProvider>
                  <AccountingProvider>
                    <App />
                  </AccountingProvider>
                </CampusProvider>
              </PackageProvider>
            </DataProvider>
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
