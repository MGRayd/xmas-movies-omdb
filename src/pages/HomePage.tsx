import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-christmas text-5xl md:text-7xl text-xmas-line mb-4">
          Christmas Movie Database
        </h1>
        <p className="text-xl md:text-2xl text-xmas-snow mb-8">Track, rate, and discover your favorite Christmas movies!</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12">
          {currentUser ? (
            <>
              <Link 
                to="/movies" 
                className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
              >
                <i className="fas fa-film mr-2"></i> My Movies
              </Link>
              <Link 
                to="/random" 
                className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
              >
                <i className="fas fa-random mr-2"></i> Random Movie
              </Link>
            </>
          ) : (
            <Link 
              to="/login" 
              className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
            >
              <i className="fas fa-sign-in-alt mr-2"></i> Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Subtle decoration */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      {/* Features section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-20 snow-accumulation snow-accumulation-slow relative">
        <h2 className="font-christmas text-3xl text-xmas-line mb-6 text-center">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-search"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Find Movies</h3>
            <p className="text-center text-xmas-text text-opacity-80">Search and discover Christmas movies using TMDB integration</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-gold">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-star"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Rate & Review</h3>
            <p className="text-center text-xmas-text text-opacity-80">Keep track of movies you've watched and rate them</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-random"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Random Picker</h3>
            <p className="text-center text-xmas-text text-opacity-80">Can't decide what to watch? Let our random movie picker help!</p>
          </div>
        </div>
      </div>
      
      {/* Import section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-30 snow-accumulation snow-accumulation-fast relative">
        <div className="mb-6 text-center">
          <h2 className="font-christmas text-3xl md:text-4xl text-xmas-gold inline-block relative">
            <span className="relative z-10">Import Your Collection</span>
            <span className="absolute -bottom-2 left-0 right-0 h-1 bg-xmas-gold opacity-30 rounded-full"></span>
          </h2>
          <p className="mt-4 mb-6">Already have a list of Christmas movies? Import them from Excel or search TMDB!</p>
          {currentUser ? (
            <Link to="/import" className="btn btn-primary">
              <i className="fas fa-file-import mr-2"></i> Import Movies
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary">
              <i className="fas fa-sign-in-alt mr-2"></i> Sign In to Import
            </Link>
          )}
        </div>
      </div>

      {/* Modern footer separator */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      <footer className="text-center text-xmas-mute mt-12 pb-8">
        <p>© {new Date().getFullYear()} Christmas Movie Database</p>
      </footer>
    </div>
  );
};

export default HomePage;
