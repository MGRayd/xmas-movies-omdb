import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function AppLayout() {
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Add snowflakes effect
  useEffect(() => {
    const createSnowflakes = () => {
      const snowflakesContainer = document.createElement('div');
      snowflakesContainer.className = 'snowflakes';
      snowflakesContainer.setAttribute('aria-hidden', 'true');
      snowflakesContainer.style.position = 'fixed';
      snowflakesContainer.style.top = '0';
      snowflakesContainer.style.left = '0';
      snowflakesContainer.style.width = '100%';
      snowflakesContainer.style.height = '100%';
      snowflakesContainer.style.pointerEvents = 'none';
      snowflakesContainer.style.zIndex = '100';
      snowflakesContainer.style.overflow = 'hidden';
      
      // Create 50 snowflakes
      for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = '❅';
        snowflake.style.color = 'white';
        snowflake.style.position = 'absolute';
        snowflake.style.top = '-10px';
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.opacity = (Math.random() * 0.7 + 0.3).toString();
        snowflake.style.fontSize = (Math.random() * 20 + 10) + 'px';
        snowflake.style.animation = `fall ${Math.random() * 10 + 5}s linear infinite`;
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        
        snowflakesContainer.appendChild(snowflake);
      }
      
      document.body.appendChild(snowflakesContainer);
      
      // Add animation styles
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
      `;
      document.head.appendChild(styleElement);
      
      return () => {
        document.body.removeChild(snowflakesContainer);
        document.head.removeChild(styleElement);
      };
    };
    
    const cleanup = createSnowflakes();
    return cleanup;
  }, []);

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
    <div className="min-h-screen bg-gradient-to-b from-xmas-bg to-xmas-card">
      <div className="navbar bg-xmas-card bg-opacity-90 border-b border-xmas-gold px-2 sm:px-4 shadow-lg">
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
          <Link to="/" className="btn btn-ghost normal-case text-lg sm:text-xl hidden sm:inline-flex font-christmas">
            <i className="fas fa-holly-berry text-xmas-line mr-2"></i>
            Xmas Quiz
          </Link>
        </div>
        
        {/* Push admin to the right */}
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {isAdmin && (
            <Link to="/admin" className="btn btn-primary btn-sm whitespace-nowrap px-2 sm:px-3">
              <i className="fas fa-lock mr-1"></i> Admin
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-70 z-20 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMobileMenu}>
      </div>
      
      {/* Mobile navigation drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-xmas-bg border-r border-xmas-gold z-30 transform transition-transform duration-300 ease-in-out md:hidden shadow-xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b border-xmas-gold bg-xmas-card">
          <span className="font-christmas text-xl text-xmas-line">
            <i className="fas fa-holly-berry mr-2"></i>
            Xmas Quiz
          </span>
          <button 
            className="btn btn-ghost btn-sm text-xmas-text hover:text-xmas-line" 
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
            <li className="menu-title pt-2 text-xmas-gold font-christmas">Navigation</li>
            <li>
              <NavLink 
                to="/" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-xmas-gold' : 'text-xmas-text hover:text-xmas-link'}
              >
                <i className="fas fa-home mr-2"></i> Home
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/quiz" 
                onClick={toggleMobileMenu}
                className={({isActive}) => isActive ? 'active font-medium text-xmas-gold' : 'text-xmas-text hover:text-xmas-link'}
              >
                <i className="fas fa-question-circle mr-2"></i> Take Quiz
              </NavLink>
            </li>
            
            {isAdmin && (
              <>
                <li className="menu-title pt-4 text-xmas-gold font-christmas">Admin</li>
                <li>
                  <NavLink 
                    to="/admin" 
                    onClick={toggleMobileMenu}
                    className={({isActive}) => isActive ? 'active font-medium text-xmas-gold' : 'text-xmas-text hover:text-xmas-link'}
                  >
                    <i className="fas fa-cog mr-2"></i> Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/admin/results" 
                    onClick={toggleMobileMenu}
                    className={({isActive}) => isActive ? 'active font-medium text-xmas-gold' : 'text-xmas-text hover:text-xmas-link'}
                  >
                    <i className="fas fa-trophy mr-2"></i> Results
                  </NavLink>
                </li>
              </>
            )}
          </nav>
        </div>
      </div>

      <main className="p-4">
        <Outlet />
      </main>
      
      {/* Christmas decorations */}
      <div className="fixed bottom-0 left-0 w-full pointer-events-none">
        <div className="container mx-auto">
          <div className="relative h-32">
            <div className="absolute bottom-0 left-0 opacity-50">
              <i className="fas fa-holly-berry text-6xl text-xmas-line"></i>
            </div>
            <div className="absolute bottom-0 left-16 opacity-40">
              <i className="fas fa-gift text-5xl text-xmas-gold"></i>
            </div>
            <div className="absolute bottom-0 right-0 opacity-50">
              <i className="fas fa-candy-cane text-6xl text-xmas-line"></i>
            </div>
            <div className="absolute bottom-0 right-16 opacity-40">
              <i className="fas fa-snowflake text-5xl text-xmas-snow"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
