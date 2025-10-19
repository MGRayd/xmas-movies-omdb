import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface ScoreData {
  id: string;
  playerName: string;
  score: number;
  timestamp: Date;
}

const AdminResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'score' | 'timestamp' | 'playerName'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Redirect if not admin
  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  // Fetch scores
  useEffect(() => {
    const fetchScores = async () => {
      if (!isAdmin) return;
      
      try {
        const scoresQuery = query(
          collection(db, 'scores'),
          orderBy(sortField, sortDirection)
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
        setError('Failed to load scores');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchScores();
    }
  }, [isAdmin, sortField, sortDirection]);

  const handleSort = (field: 'score' | 'timestamp' | 'playerName') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!confirm('Are you sure you want to delete this score?')) return;
    
    try {
      await deleteDoc(doc(db, 'scores', scoreId));
      setScores(scores.filter(score => score.id !== scoreId));
    } catch (err) {
      console.error('Error deleting score:', err);
      setError('Failed to delete score');
    }
  };

  if (adminCheckLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">Quiz Results</h1>
        <Link to="/admin" className="btn btn-outline">
          <i className="fas fa-arrow-left mr-2"></i> Back to Dashboard
        </Link>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {scores.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center">
          <h3 className="text-xl mb-4">No quiz results yet</h3>
          <p>Results will appear here once players complete the quiz</p>
        </div>
      ) : (
        <>
          <div className="bg-xmas-card p-4 rounded-lg mb-6">
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Total Players</div>
                <div className="stat-value">{scores.length}</div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Average Score</div>
                <div className="stat-value">
                  {Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length)}
                </div>
              </div>
              
              <div className="stat">
                <div className="stat-title">Highest Score</div>
                <div className="stat-value">{Math.max(...scores.map(score => score.score))}</div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>
                    <button 
                      className="flex items-center"
                      onClick={() => handleSort('playerName')}
                    >
                      Player
                      {sortField === 'playerName' && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                      )}
                    </button>
                  </th>
                  <th>
                    <button 
                      className="flex items-center"
                      onClick={() => handleSort('score')}
                    >
                      Score
                      {sortField === 'score' && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                      )}
                    </button>
                  </th>
                  <th>
                    <button 
                      className="flex items-center"
                      onClick={() => handleSort('timestamp')}
                    >
                      Date
                      {sortField === 'timestamp' && (
                        <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                      )}
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr key={score.id}>
                    <td>{index + 1}</td>
                    <td>{score.playerName}</td>
                    <td className="font-bold">{score.score}</td>
                    <td>{score.timestamp.toLocaleDateString()} {score.timestamp.toLocaleTimeString()}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-error btn-outline"
                        onClick={() => handleDeleteScore(score.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminResultsPage;
