import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { Round, RoundType } from '../types/quiz';

const AdminRoundsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  
  // Form state
  const [roundTitle, setRoundTitle] = useState('');
  const [roundDescription, setRoundDescription] = useState('');
  const [roundType, setRoundType] = useState<RoundType>(RoundType.GENERAL);
  const [roundOrder, setRoundOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);

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
      
      try {
        const roundsQuery = query(
          collection(db, 'rounds'),
          orderBy('order', 'asc')
        );
        
        const querySnapshot = await getDocs(roundsQuery);
        const fetchedRounds: Round[] = [];
        
        querySnapshot.forEach((doc) => {
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

  const resetForm = () => {
    setRoundTitle('');
    setRoundDescription('');
    setRoundType(RoundType.GENERAL);
    setRoundOrder(rounds.length + 1);
    setEditingRound(null);
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Create round document
      await addDoc(collection(db, 'rounds'), {
        title: roundTitle,
        description: roundDescription,
        type: roundType,
        order: roundOrder
      });
      
      // Refresh rounds
      const roundsQuery = query(
        collection(db, 'rounds'),
        orderBy('order', 'asc')
      );
      
      const querySnapshot = await getDocs(roundsQuery);
      const updatedRounds: Round[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Round, 'id'>;
        updatedRounds.push({
          id: doc.id,
          ...data
        } as Round);
      });
      
      setRounds(updatedRounds);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error adding round:', err);
      setError('Failed to add round');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setRoundTitle(round.title);
    setRoundDescription(round.description);
    setRoundType(round.type);
    setRoundOrder(round.order);
    setShowAddModal(true);
  };

  const handleUpdateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRound) return;
    
    setSubmitting(true);
    
    try {
      // Update round document
      const roundRef = doc(db, 'rounds', editingRound.id);
      await updateDoc(roundRef, {
        title: roundTitle,
        description: roundDescription,
        type: roundType,
        order: roundOrder
      });
      
      // Refresh rounds
      const roundsQuery = query(
        collection(db, 'rounds'),
        orderBy('order', 'asc')
      );
      
      const querySnapshot = await getDocs(roundsQuery);
      const updatedRounds: Round[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Round, 'id'>;
        updatedRounds.push({
          id: doc.id,
          ...data
        } as Round);
      });
      
      setRounds(updatedRounds);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating round:', err);
      setError('Failed to update round');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm('Are you sure you want to delete this round? This will NOT delete questions in this round.')) return;
    
    try {
      await deleteDoc(doc(db, 'rounds', roundId));
      setRounds(rounds.filter(round => round.id !== roundId));
    } catch (err) {
      console.error('Error deleting round:', err);
      setError('Failed to delete round');
    }
  };

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
        <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">Quiz Rounds</h1>
        <div className="flex gap-2">
          <Link to="/admin" className="btn btn-outline">
            <i className="fas fa-arrow-left mr-2"></i> Back to Dashboard
          </Link>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setRoundOrder(rounds.length + 1);
              setShowAddModal(true);
            }}
          >
            <i className="fas fa-plus mr-2"></i> Add Round
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {rounds.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center">
          <h3 className="text-xl mb-4">No rounds yet</h3>
          <p className="mb-4">Start by adding your first quiz round!</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus mr-2"></i> Add Round
          </button>
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
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => handleEditRound(round)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn btn-error btn-outline btn-sm"
                    onClick={() => handleDeleteRound(round.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add/Edit Round Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-xmas-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-christmas">
                  {editingRound ? 'Edit Round' : 'Add New Round'}
                </h2>
                <button 
                  className="btn btn-sm btn-circle"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={editingRound ? handleUpdateRound : handleAddRound}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Round Title</span>
                  </label>
                  <input 
                    type="text" 
                    className="input input-bordered" 
                    value={roundTitle}
                    onChange={(e) => setRoundTitle(e.target.value)}
                    placeholder="e.g., Christmas Movies"
                    required
                  />
                </div>
                
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea 
                    className="textarea textarea-bordered h-20" 
                    value={roundDescription}
                    onChange={(e) => setRoundDescription(e.target.value)}
                    placeholder="Brief description of this round"
                  />
                </div>
                
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Round Type</span>
                  </label>
                  <select 
                    className="select select-bordered w-full" 
                    value={roundType}
                    onChange={(e) => setRoundType(e.target.value as RoundType)}
                    required
                  >
                    <option value={RoundType.GENERAL}>General Questions</option>
                    <option value={RoundType.PICTURE}>Picture Round</option>
                    <option value={RoundType.MUSIC}>Music Round</option>
                    <option value={RoundType.TRIVIA}>Trivia Round</option>
                    <option value={RoundType.CHRISTMAS}>Christmas Round</option>
                  </select>
                </div>
                
                <div className="form-control mb-6">
                  <label className="label">
                    <span className="label-text">Display Order</span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered" 
                    value={roundOrder}
                    onChange={(e) => setRoundOrder(parseInt(e.target.value) || 1)}
                    min="1"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        {editingRound ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingRound ? 'Update Round' : 'Add Round'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoundsPage;
