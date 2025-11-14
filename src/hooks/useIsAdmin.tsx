// src/hooks/useIsAdmin.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase';

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

      setCurrentUser({ uid: user.uid, email: user.email });

      try {
        // forceRefresh: true so we get the latest custom claims
        const tokenResult = await getIdTokenResult(user, true);
        // admin-manager.cjs sets { admin: true }
        const hasAdminClaim = tokenResult.claims.admin === true;

        setIsAdmin(hasAdminClaim);
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
