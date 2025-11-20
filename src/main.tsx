// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from './ui/AppLayout'
import './index.css'
import './ui/typography.css'

// Import authentication context
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './ui/ToastProvider'

// Import components
import ProtectedRoute from './components/ProtectedRoute'

// Import pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

// Movie pages (to be created)
import MoviesPage from './pages/MoviesPage'
import MovieDetailPage from './pages/MovieDetailPage'
import MovieImportPage from './pages/MovieImportPage'
import RandomMoviePage from './pages/RandomMoviePage'
import ProfilePage from './pages/ProfilePage'
import AchievementsPage from './pages/AchievementsPage'

// Admin pages
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

const router = createBrowserRouter([
  { 
    element: <AppLayout />, 
    children: [
      // Public routes
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      
      // Protected routes
      { 
        element: <ProtectedRoute />,
        children: [
          { path: '/movies', element: <MoviesPage /> },
          { path: '/movies/:movieId', element: <MovieDetailPage /> },
          { path: '/import', element: <MovieImportPage /> },
          { path: '/random', element: <RandomMoviePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/achievements', element: <AchievementsPage /> },
        ]
      },
      
      // Admin routes
      { path: '/admin/login', element: <AdminLoginPage /> },
      { 
        path: '/admin',
        element: (
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        )
      },
    ] 
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
)
