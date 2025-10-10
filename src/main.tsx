// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from './ui/AppLayout'
import './index.css'
import './ui/typography.css'
import Home from './pages/Home'
import ListPage from './pages/ListPage'
import DetailPage from './pages/DetailPage'
import Calendar from './pages/Calendar'
import SearchResults from './pages/SearchResults'
import AdminGate from './admin/AdminGate'
import ThreadList from './pages/ThreadList'
import ThreadDetail from './pages/ThreadDetail'

// Editors
import SessionEditor from './components/admin/sessions/SessionEditor'
import SessionNotes from './components/admin/sessions/SessionNotes'
import NpcEditor from './components/admin/npc/NpcEditor'
import LocationEditor from './components/admin/locations/LocationEditor'
import MonsterEditor from './components/admin/monsters/MonsterEditor'
import CharacterEditor from './components/admin/characters/CharacterEditor'
import ThreadEditor from './components/admin/threads/ThreadEditor'
import PlayerCharacterManager from './components/admin/playerCharacters/PlayerCharacterManager'
import SettingsManager from './components/admin/settings/SettingsManager'

const router = createBrowserRouter([
  { element: <AppLayout />, children: [
    { path: '/', element: <Home /> },
    { path: '/calendar', element: <Calendar /> },
    { path: '/sessions', element: <ListPage collection="sessions" /> },
    { path: '/sessions/:slug', element: <DetailPage collection="sessions" /> },
    { path: '/npcs', element: <ListPage collection="npcs" /> },
    { path: '/npcs/:slug', element: <DetailPage collection="npcs" /> },
    { path: '/monsters', element: <ListPage collection="monsters" /> },
    { path: '/monsters/:slug', element: <DetailPage collection="monsters" /> },
    { path: '/locations', element: <ListPage collection="locations" /> },
    { path: '/locations/:slug', element: <DetailPage collection="locations" /> },
    { path: '/characters', element: <ListPage collection="characters" /> },
    { path: '/characters/:slug', element: <DetailPage collection="characters" /> },
    { path: '/threads', element: <ThreadList /> },
    { path: '/threads/:slug', element: <ThreadDetail /> },
    { path: '/search', element: <SearchResults /> },

    // Admin landing
    { path: '/admin', element: <AdminGate /> },

    // Sessions
    { path: '/admin/sessions/new', element: <SessionEditor mode="create" /> },
    { path: '/admin/sessions/:id/edit', element: <SessionEditor mode="edit" /> },
    { path: '/admin/session-notes', element: <SessionNotes /> },
    { path: '/admin/session-notes/:id', element: <SessionNotes /> },

    // Monsters
    { path: '/admin/monsters/new', element: <MonsterEditor mode="create" /> },
    { path: '/admin/monsters/:id/edit', element: <MonsterEditor mode="edit" /> },

    // NPCs
    { path: '/admin/npcs/new', element: <NpcEditor mode="create" /> },
    { path: '/admin/npcs/:id/edit', element: <NpcEditor mode="edit" /> },

    // Locations
    { path: '/admin/locations/new', element: <LocationEditor mode="create" /> },
    { path: '/admin/locations/:id/edit', element: <LocationEditor mode="edit" /> },

    // Characters
    { path: '/admin/characters/new', element: <CharacterEditor mode="create" /> },
    { path: '/admin/characters/:id/edit', element: <CharacterEditor mode="edit" /> },

    // Threads
    { path: '/admin/threads/new', element: <ThreadEditor mode="create" /> },
    { path: '/admin/threads/:id/edit', element: <ThreadEditor mode="edit" /> },

    // Player Characters
    { path: '/admin/player-characters', element: <PlayerCharacterManager /> },

    // Settings
    { path: '/admin/settings', element: <SettingsManager /> },
  ] }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
