import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface ScoreData {
  id: string;
  playerName: string;
  score: number;
  timestamp: Date;
}

const Scoreboard: React.FC = () => {
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const scoresQuery = query(
          collection(db, 'scores'),
          orderBy('score', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(scoresQuery);
        const scoresList: ScoreData[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          scoresList.push({
            id: doc.id,
            playerName: data.playerName,
            score: data.score,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });
        
        setScores(scoresList);
      } catch (err) {
        console.error('Error fetching scores:', err);
        setError('Failed to load scoreboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-error p-4">
        <p>{error}</p>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-xl">No scores yet! Be the first to play!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto snow-accumulation snow-pile relative">
      <table className="table w-full">
        <thead>
          <tr className="text-xmas-gold">
            <th className="text-center">#</th>
            <th>Player</th>
            <th className="text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => (
            <tr 
              key={score.id} 
              className={`${index < 3 ? 'font-bold' : ''} ${index === 0 ? 'bg-opacity-20 bg-xmas-gold' : ''}`}
            >
              <td className="text-center">
                {index === 0 && <i className="fas fa-crown text-xmas-gold mr-1"></i>}
                {index + 1}
              </td>
              <td className="flex items-center gap-2">
                {score.playerName}
                {index === 0 && <span className="badge badge-warning">Champion</span>}
                {index === 1 && <span className="badge badge-secondary">Runner-up</span>}
              </td>
              <td className="text-right font-bold">{score.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Scoreboard;
