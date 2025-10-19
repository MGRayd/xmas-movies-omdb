import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';

import { Round, RoundType } from '../types/quiz';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  // Fetch rounds
  useEffect(() => {
    const fetchRounds = async () => {
      if (!isAdmin) return;
      
      setLoading(true);
      try {
        // Fetch rounds
        const roundsSnapshot = await getDocs(query(
          collection(db, 'rounds'),
          orderBy('order', 'asc')
        ));
        
        const fetchedRounds: Round[] = [];
        roundsSnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Round, 'id'>;
          fetchedRounds.push({
            id: doc.id,
            ...data
          } as Round);
        });
        
        setRounds(fetchedRounds);
      } catch (err) {
        console.error('Error fetching rounds:', err);
        setError('Failed to load rounds');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchRounds();
    }
  }, [isAdmin]);

    const getRoundTypeIcon = (type: RoundType) => {
    switch (type) {
      case RoundType.PICTURE:
        return <i className="fas fa-image text-info"></i>;
      case RoundType.MUSIC:
        return <i className="fas fa-music text-success"></i>;
      case RoundType.TRIVIA:
        return <i className="fas fa-lightbulb text-warning"></i>;
      case RoundType.CHRISTMAS:
        return <i className="fas fa-holly-berry text-error"></i>;
      default:
        return <i className="fas fa-question-circle text-primary"></i>;
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
        <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/admin/results" className="btn btn-outline">
            <i className="fas fa-trophy mr-2"></i> View Results
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-2xl font-christmas mb-4 text-xmas-gold">Quiz Rounds</h2>
        {rounds.length === 0 ? (
          <div className="bg-xmas-card p-8 rounded-lg text-center">
            <h3 className="text-xl mb-4">No rounds yet</h3>
            <p className="mb-4">Start by adding your first quiz round!</p>
            <Link to="/admin/rounds" className="btn btn-primary">
              <i className="fas fa-plus mr-2"></i> Add Round
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rounds.map((round) => (
              <div key={round.id} className="card bg-xmas-card shadow-xl">
                <div className="card-body">
                  <div className="flex justify-between items-center">
                    <h2 className="card-title font-christmas">
                      {getRoundTypeIcon(round.type)} {round.title}
                    </h2>
                    <div className="badge badge-outline">#{round.order}</div>
                  </div>
                  <p className="text-sm mb-4">{round.description}</p>
                  <div className="card-actions justify-end">
                    <Link 
                      to={`/admin/questions/${round.id}`} 
                      className="btn btn-primary btn-sm"
                    >
                      <i className="fas fa-list mr-1"></i> Manage Questions
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            <div className="card bg-base-100 border-2 border-dashed border-base-300 shadow-xl flex items-center justify-center">
              <div className="card-body items-center text-center">
                <h2 className="card-title font-christmas">Add New Round</h2>
                <p>Create a new quiz round</p>
                <div className="card-actions justify-center mt-4">
                  <Link to="/admin/rounds" className="btn btn-primary">
                    <i className="fas fa-plus mr-2"></i> Add Round
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
