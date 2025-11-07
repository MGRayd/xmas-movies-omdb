import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import SnowEffect from '../components/SnowEffect'

export default function AppLayout() {
  const { currentUser } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-b from-xmas-bg to-xmas-card bg-opacity-95">
      <SnowEffect snowflakeCount={150} />
      <div className="navbar bg-gradient-to-r from-xmas-card via-xmas-card to-xmas-bg border-b border-xmas-gold px-2 sm:px-4 shadow-lg relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-xmas-gold via-transparent to-xmas-gold opacity-60"></div>
        <div className="absolute -bottom-4 left-0 right-0 h-8 snow-accumulation-fast"></div>
        
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button 
            className="btn btn-ghost btn-sm md:hidden relative z-10" 
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
          
          {/* Logo for all screen sizes with enhanced styling */}
          <Link to="/" className="hidden sm:flex items-center group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-xmas-gold to-xmas-line rounded-full opacity-70 group-hover:opacity-100 blur transition duration-200"></div>
              <div className="relative flex items-center justify-center w-10 h-10 bg-xmas-card rounded-full border border-xmas-gold overflow-hidden">
                <img src="/Santa.png" alt="Santa" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="ml-3 font-christmas text-xl sm:text-2xl bg-gradient-to-br from-xmas-gold via-xmas-snow to-xmas-gold bg-clip-text text-transparent font-bold">
              Christmas Movies
            </div>
          </Link>
          
          {/* Mobile logo */}
          <Link to="/" className="sm:hidden flex items-center">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-xmas-card border border-xmas-gold overflow-hidden">
              <img src="/Santa.png" alt="Santa" className="w-full h-full object-cover" />
            </div>
            <span className="ml-2 font-christmas text-lg text-xmas-gold">Christmas Movies</span>
          </Link>
        </div>
        
        {/* Push user menu to the right */}
        <div className="flex-1"></div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {currentUser && (
            <Link to="/profile" className="btn btn-primary btn-sm hidden md:flex">
              <i className="fas fa-user-circle mr-1"></i> Profile
            </Link>
          )}
          {currentUser ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar cursor-pointer">
                <div className="w-10 rounded-full border border-xmas-gold">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" />
                  ) : (
                    <div className="bg-xmas-card flex items-center justify-center h-full">
                      <i className="fas fa-user text-xmas-gold"></i>
                    </div>
                  )}
                </div>
              </label>
              <ul tabIndex={0} className="dropdown-content menu menu-sm mt-3 z-[1] p-2 shadow bg-xmas-card rounded-box w-52 border border-xmas-gold">
                <li>
                  <Link to="/profile" className="justify-between">
                    Profile
                    <i className="fas fa-user-circle"></i>
                  </Link>
                </li>
                <li>
                  <Link to="/movies">
                    My Movies
                    <i className="fas fa-film"></i>
                  </Link>
                </li>
                <li>
                  <Link to="/random">
                    Random Movie
                    <i className="fas fa-random"></i>
                  </Link>
                </li>
                <li>
                  <Link to="/import">
                    Import Movies
                    <i className="fas fa-file-import"></i>
                  </Link>
                </li>
              </ul>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <i className="fas fa-sign-in-alt mr-1"></i> Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile navigation drawer overlay */}
      <div className={`fixed inset-0 bg-black bg-opacity-70 z-20 transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMobileMenu}>
      </div>
      
      {/* Mobile navigation drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-xmas-bg to-xmas-card border-r border-xmas-gold z-30 transform transition-transform duration-300 ease-in-out md:hidden shadow-xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative overflow-hidden">
          {/* Decorative snow at top of mobile menu */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-xmas-gold via-transparent to-xmas-gold opacity-60"></div>
          
          <div className="flex justify-between items-center p-4 border-b border-xmas-gold bg-xmas-card bg-opacity-80">
            <div className="flex items-center">
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-xmas-card border border-xmas-gold shadow-lg overflow-hidden">
                <img src="/Santa.png" alt="Santa" className="w-full h-full object-cover" />
              </div>
              <div className="ml-3 font-christmas text-xl bg-gradient-to-br from-xmas-gold via-xmas-snow to-xmas-gold bg-clip-text text-transparent font-bold">
                Christmas Movies
              </div>
            </div>
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
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          <div className="p-4 pt-6">
            <div className="mb-6">
              <h3 className="font-christmas text-xl text-xmas-gold mb-4 pl-2 border-l-2 border-xmas-line">
                Navigation
              </h3>
              <ul className="space-y-3">
                <li>
                  <NavLink 
                    to="/" 
                    onClick={toggleMobileMenu}
                    className={({isActive}) => 
                      isActive 
                        ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                        : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                    }
                  >
                    {({isActive}) => (
                      <>
                        <i className="fas fa-home mr-3 text-xmas-gold"></i> 
                        <span>Home</span>
                        {/* Snowflake indicator */}
                        <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                      </>
                    )}
                  </NavLink>
                </li>
                {currentUser ? (
                  <>
                    <li>
                      <NavLink 
                        to="/movies" 
                        onClick={toggleMobileMenu}
                        className={({isActive}) => 
                          isActive 
                            ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                            : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                        }
                      >
                        {({isActive}) => (
                          <>
                            <i className="fas fa-film mr-3 text-xmas-gold"></i> 
                            <span>My Movies</span>
                            {/* Snowflake indicator */}
                            <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                          </>
                        )}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink 
                        to="/random" 
                        onClick={toggleMobileMenu}
                        className={({isActive}) => 
                          isActive 
                            ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                            : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                        }
                      >
                        {({isActive}) => (
                          <>
                            <i className="fas fa-random mr-3 text-xmas-gold"></i> 
                            <span>Random Movie</span>
                            {/* Snowflake indicator */}
                            <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                          </>
                        )}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink 
                        to="/import" 
                        onClick={toggleMobileMenu}
                        className={({isActive}) => 
                          isActive 
                            ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                            : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                        }
                      >
                        {({isActive}) => (
                          <>
                            <i className="fas fa-file-import mr-3 text-xmas-gold"></i> 
                            <span>Import Movies</span>
                            {/* Snowflake indicator */}
                            <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                          </>
                        )}
                      </NavLink>
                    </li>
                    <li>
                      <NavLink 
                        to="/profile" 
                        onClick={toggleMobileMenu}
                        className={({isActive}) => 
                          isActive 
                            ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                            : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                        }
                      >
                        {({isActive}) => (
                          <>
                            <i className="fas fa-user-circle mr-3 text-xmas-gold"></i> 
                            <span>Profile</span>
                            {/* Snowflake indicator */}
                            <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                          </>
                        )}
                      </NavLink>
                    </li>
                  </>
                ) : (
                  <li>
                    <NavLink 
                      to="/login" 
                      onClick={toggleMobileMenu}
                      className={({isActive}) => 
                        isActive 
                          ? 'flex items-center p-2 pl-3 rounded-md bg-gradient-to-r from-xmas-card to-transparent border-l-2 border-xmas-gold text-xmas-gold font-medium' 
                          : 'flex items-center p-2 pl-3 rounded-md hover:bg-xmas-card hover:bg-opacity-50 text-xmas-text hover:text-xmas-gold transition-all duration-200'
                      }
                    >
                      {({isActive}) => (
                        <>
                          <i className="fas fa-sign-in-alt mr-3 text-xmas-gold"></i> 
                          <span>Sign In</span>
                          {/* Snowflake indicator */}
                          <i className={`fas fa-snowflake ml-auto text-xmas-gold opacity-70 ${isActive ? 'visible' : 'invisible'}`}></i>
                        </>
                      )}
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <main className="p-4">
        <Outlet />
      </main>
      
      {/* Modern subtle Christmas footer */}
      <div className="fixed bottom-0 left-0 w-full pointer-events-none">
        <div className="container mx-auto">
          <div className="relative h-16">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-xmas-gold via-transparent to-xmas-gold opacity-40"></div>
            <div className="absolute bottom-4 left-4 opacity-30">
              <i className="fas fa-tree text-4xl text-xmas-gold"></i>
            </div>
            <div className="absolute bottom-4 right-4 opacity-30">
              <i className="fas fa-star text-4xl text-xmas-gold"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
