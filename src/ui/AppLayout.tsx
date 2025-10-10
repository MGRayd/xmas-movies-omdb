import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/ui/ToastProvider'
import SearchBar from '@/components/SearchBar'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useState, useEffect } from 'react'

export default function AppLayout() {
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Handle body scroll locking when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      // Prevent scrolling on the body when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when menu is closed
      document.body.style.overflow = '';
    }
    
    // Cleanup function to ensure scroll is re-enabled if component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);
  
  // Close mobile menu when route changes
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <ToastProvider>
    <div className="min-h-screen">
      <div className="navbar bg-base-200 border-b border-base-300 px-2 sm:px-4">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button 
            className="btn btn-ghost btn-sm md:hidden" 
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          {/* Hide title on mobile, show on sm and up */}
          <Link to="/" className="btn btn-ghost normal-case text-lg sm:text-xl hidden sm:inline-flex">Terraveil Journal</Link>
        </div>
        
        {/* Push search and admin to the right */}
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-auto">
            <SearchBar />
          </div>
          {isAdmin && (
            <Link to="/admin" className="btn btn-primary btn-sm whitespace-nowrap px-2 sm:px-3">Admin</Link>
          )}
        </div>
      </div>

      {/* Mobile navigation drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-70 z-20 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMobileMenu}>
      </div>
      
      {/* Mobile navigation drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-terraveil-bg border-r border-base-300 z-30 transform transition-transform duration-300 ease-in-out md:hidden shadow-xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b border-base-300 bg-terraveil-card">
          <span className="font-bold text-xl text-terraveil-line">Terraveil Journal</span>
          <button 
            className="btn btn-ghost btn-sm text-terraveil-text hover:text-terraveil-line" 
            onClick={toggleMobileMenu}
            aria-label="Close navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          <nav className="menu p-4">
            <li className="menu-title pt-2 text-terraveil-line">Campaigns</li>
            <li>
              <NavLink 
                to="/calendar" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Calendar
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/sessions" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Sessions
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/threads" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Threads
              </NavLink>
            </li>
            
            <li className="menu-title pt-4 text-terraveil-line">World</li>
            <li>
              <NavLink 
                to="/locations" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Locations
              </NavLink>
            </li>
            
            <li className="menu-title pt-4 text-terraveil-line">Characters & Creatures</li>
            <li>
              <NavLink 
                to="/characters" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Characters
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/npcs" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                NPCs
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/monsters" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-terraveil-line' : 'text-terraveil-text hover:text-terraveil-link'}
              >
                Monsters
              </NavLink>
            </li>
          </nav>
        </div>
      </div>

      <div className="grid md:grid-cols-[240px,1fr]">
        {/* Desktop sidebar - hidden on mobile */}
        <aside className="hidden md:block border-r border-base-300 p-4">
          <nav className="menu">
            <li className="menu-title">Campaigns</li>
            <li><NavLink to="/calendar">Calendar</NavLink></li>
            <li><NavLink to="/sessions">Sessions</NavLink></li>
            <li><NavLink to="/threads">Threads</NavLink></li>
            <li className="menu-title">World</li>
            <li><NavLink to="/locations">Locations</NavLink></li>
            <li className="menu-title">Characters & Creatures</li>
            <li><NavLink to="/characters">Characters</NavLink></li>
            <li><NavLink to="/npcs">NPCs</NavLink></li>
            <li><NavLink to="/monsters">Monsters</NavLink></li>
          </nav>
        </aside>
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
