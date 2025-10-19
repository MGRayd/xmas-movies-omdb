import { useState, useEffect } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UseIsAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  currentUser: { uid: string; email: string | null } | null;
}

export const useIsAdmin = (): UseIsAdminResult => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string | null } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setIsAdmin(false);
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      setCurrentUser({
        uid: user.uid,
        email: user.email
      });

      try {
        // First check for admin custom claim
        const tokenResult = await getIdTokenResult(user);
        const hasAdminClaim = tokenResult.claims.admin === true;
        
        if (hasAdminClaim) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }
        
        // Fallback: check if user is in admins collection
        const adminRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminRef);
        
        setIsAdmin(adminDoc.exists());
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, loading, error, currentUser };
};
