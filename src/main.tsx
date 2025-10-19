// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from './ui/AppLayout'
import './index.css'
import './ui/typography.css'

// Import pages
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminResultsPage from './pages/AdminResultsPage'
import AdminRoundsPage from './pages/AdminRoundsPage'
import AdminRoundQuestionsPage from './pages/AdminRoundQuestionsPage'

const router = createBrowserRouter([
  { 
    element: <AppLayout />, 
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/quiz', element: <QuizPage /> },
      { path: '/admin/login', element: <AdminLoginPage /> },
      { path: '/admin', element: <AdminDashboardPage /> },
      { path: '/admin/results', element: <AdminResultsPage /> },
      { path: '/admin/rounds', element: <AdminRoundsPage /> },
      { path: '/admin/questions/:roundId', element: <AdminRoundQuestionsPage /> },
    ] 
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
