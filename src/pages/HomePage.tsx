import React from 'react';
import { Link } from 'react-router-dom';
import Scoreboard from '../components/Scoreboard';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="font-christmas text-5xl md:text-7xl text-xmas-line mb-4 animate-pulse">
          <i className="fas fa-snowflake text-xmas-snow mr-2"></i>
          Christmas Quiz
          <i className="fas fa-snowflake text-xmas-snow ml-2"></i>
        </h1>
        <p className="text-xl md:text-2xl text-xmas-snow mb-8">Test your Christmas knowledge and compete for the top spot!</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mb-12">
          <Link 
            to="/quiz" 
            className="btn btn-primary btn-lg font-christmas text-xl px-8 py-4 rounded-full shadow-lg transform transition-transform hover:scale-105"
          >
            <i className="fas fa-play-circle mr-2"></i> Start Quiz
          </Link>
        </div>
      </div>

      {/* Christmas decorations */}
      <div className="relative">
        <div className="absolute -top-8 left-0 text-4xl text-xmas-gold opacity-70">
          <i className="fas fa-star"></i>
        </div>
        <div className="absolute -top-12 right-1/4 text-3xl text-xmas-gold opacity-60">
          <i className="fas fa-bell"></i>
        </div>
        <div className="absolute -top-6 right-1/3 text-2xl text-xmas-gold opacity-80">
          <i className="fas fa-gift"></i>
        </div>
      </div>

      {/* Scoreboard section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12 border-2 border-xmas-gold">
        <h2 className="font-christmas text-3xl md:text-4xl text-xmas-gold mb-6 text-center">
          <i className="fas fa-trophy mr-2"></i> Leaderboard
        </h2>
        <Scoreboard />
      </div>

      {/* How to play section */}
      <div className="bg-xmas-card rounded-lg shadow-xl p-6 mb-12">
        <h2 className="font-christmas text-3xl text-xmas-line mb-4">How to Play</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-opacity-20 bg-xmas-snow p-4 rounded-lg">
            <div className="text-4xl text-xmas-gold mb-2 text-center">
              <i className="fas fa-question-circle"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-2">Answer Questions</h3>
            <p className="text-center">Test your Christmas knowledge with our festive questions!</p>
          </div>
          
          <div className="bg-opacity-20 bg-xmas-snow p-4 rounded-lg">
            <div className="text-4xl text-xmas-gold mb-2 text-center">
              <i className="fas fa-gift"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-2">Multiple Rounds</h3>
            <p className="text-center">Enjoy different themed rounds of Christmas fun!</p>
          </div>
          
          <div className="bg-opacity-20 bg-xmas-snow p-4 rounded-lg">
            <div className="text-4xl text-xmas-gold mb-2 text-center">
              <i className="fas fa-medal"></i>
            </div>
            <h3 className="font-christmas text-xl text-center mb-2">Compete</h3>
            <p className="text-center">Get on the leaderboard and show off your Christmas spirit!</p>
          </div>
        </div>
      </div>

      {/* Christmas decorations at bottom */}
      <div className="relative h-24 mb-8">
        <div className="absolute bottom-0 left-0 w-24 h-24">
          <i className="fas fa-holly-berry text-4xl text-xmas-line"></i>
        </div>
        <div className="absolute bottom-0 right-0 w-24 h-24">
          <i className="fas fa-candy-cane text-4xl text-xmas-line"></i>
        </div>
      </div>

      <footer className="text-center text-xmas-mute mt-12 pb-8">
        <p>© {new Date().getFullYear()} Christmas Quiz | <Link to="/admin/login" className="hover:text-xmas-link">Admin</Link></p>
      </footer>
    </div>
  );
};

export default HomePage;
