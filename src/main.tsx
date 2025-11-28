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
import PublicWatchlistPage from './pages/PublicWatchlistPage'
import PublicMoviePage from './pages/PublicMoviePage'
import EditMoviePosterPage from './pages/EditMoviePosterPage'

// Admin pages
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminPosterManagerPage from './pages/AdminPosterManagerPage'
import AdminImportPage from './pages/AdminImportPage'

const router = createBrowserRouter([
  { 
    element: <AppLayout />, 
    children: [
      // Public routes
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/u/:slug', element: <PublicWatchlistPage /> },
      { path: '/u/:slug/m/:movieSlug', element: <PublicMoviePage /> },
      
      // Protected routes
      { 
        element: <ProtectedRoute />,
        children: [
          { path: '/movies', element: <MoviesPage /> },
          { path: '/movies/:movieId', element: <MovieDetailPage /> },
          { path: '/movies/:movieId/edit-poster', element: <EditMoviePosterPage /> },
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
        ),
      },
      {
        path: '/admin/import',
        element: (
          <ProtectedRoute>
            <AdminImportPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/posters',
        element: (
          <ProtectedRoute>
            <AdminPosterManagerPage />
          </ProtectedRoute>
        ),
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
