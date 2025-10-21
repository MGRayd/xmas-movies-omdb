import React from 'react';
import { Link } from 'react-router-dom';
import Scoreboard from '../components/Scoreboard';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-christmas text-5xl md:text-7xl text-xmas-line mb-4">
          Christmas Quiz
        </h1>
        <p className="text-xl md:text-2xl text-xmas-snow mb-8">Test your Christmas knowledge and compete for the top spot!</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12">
          <Link 
            to="/quiz" 
            className="btn btn-primary btn-lg text-xl px-8 py-3 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 border border-xmas-gold border-opacity-30"
          >
            <i className="fas fa-play-circle mr-2"></i> Start Quiz
          </Link>
        </div>
      </div>

      {/* Subtle decoration */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      {/* Scoreboard section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-30 snow-accumulation snow-accumulation-fast relative">
        <div className="mb-6 text-center">
          <h2 className="font-christmas text-3xl md:text-4xl text-xmas-gold inline-block relative">
            <span className="relative z-10">Leaderboard</span>
            <span className="absolute -bottom-2 left-0 right-0 h-1 bg-xmas-gold opacity-30 rounded-full"></span>
          </h2>
        </div>
        <Scoreboard />
      </div>

      {/* How to play section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border border-xmas-gold border-opacity-20 snow-accumulation snow-accumulation-slow relative">
        <h2 className="font-christmas text-3xl text-xmas-line mb-6">How to Play</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-question-circle"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Answer Questions</h3>
            <p className="text-center text-xmas-text text-opacity-80">Test your Christmas knowledge with our festive questions!</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-gold">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-gift"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Multiple Rounds</h3>
            <p className="text-center text-xmas-text text-opacity-80">Enjoy different themed rounds of Christmas fun!</p>
          </div>
          
          <div className="bg-xmas-card bg-opacity-70 p-6 rounded-lg shadow-md border-l-2 border-xmas-line">
            <div className="text-3xl text-xmas-gold mb-4 text-center">
              <i className="fas fa-medal"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-3">Compete</h3>
            <p className="text-center text-xmas-text text-opacity-80">Get on the leaderboard and show off your Christmas spirit!</p>
          </div>
        </div>
      </div>

      {/* Modern footer separator */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-xmas-gold to-transparent"></div>
      </div>

      <footer className="text-center text-xmas-mute mt-12 pb-8">
        <p>© {new Date().getFullYear()} Christmas Quiz | <Link to="/admin/login" className="hover:text-xmas-link">Admin</Link></p>
      </footer>
    </div>
  );
};

export default HomePage;
