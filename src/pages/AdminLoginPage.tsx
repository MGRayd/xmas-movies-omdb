import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, provider, db } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { doc, setDoc } from 'firebase/firestore';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminCheckLoading, currentUser } = useIsAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  // This effect is no longer needed as currentUser comes from useIsAdmin

  // Redirect if already logged in as admin
  useEffect(() => {
    if (isAdmin && !adminCheckLoading) {
      navigate('/admin');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithPopup(auth, provider);
      // The redirect will happen automatically via the useEffect if the user is an admin
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different Firebase auth errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Another popup is already open. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        console.error('Unauthorized domain error:', window.location.hostname);
        setError(
          'This domain is not authorized for OAuth operations. Please add ' + 
          window.location.hostname + 
          ' to your Firebase authorized domains list in the Firebase console under Authentication > Sign-in method > Authorized domains.'
        );
      } else {
        setError('Failed to sign in. Please try again.');
      }
      
      setLoading(false);
    }
  };

  if (adminCheckLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-christmas text-4xl text-xmas-line mb-2">Admin Login</h1>
          <p className="text-xmas-mute">Sign in to manage the Christmas Quiz</p>
        </div>
        
        <div className="bg-xmas-card rounded-lg shadow-lg p-6">
          {isDevelopment && (
            <div className="bg-warning bg-opacity-10 border-l-4 border-warning p-4 mb-6 rounded">
              <p className="text-warning font-bold mb-2">Development Mode</p>
              <p className="text-warning text-sm">For local development, make sure to add <code className="bg-base-300 px-1 py-0.5 rounded">localhost</code> to your Firebase authorized domains list.</p>
            </div>
          )}
          
          {currentUser && (
            <div className="bg-info bg-opacity-10 border-l-4 border-info p-4 mb-6 rounded">
              <p className="text-info font-bold mb-2">User Authenticated</p>
              <p className="text-info text-sm mb-1">Email: {currentUser.email}</p>
              <p className="text-info text-sm mb-2">UID: {currentUser.uid}</p>
              <p className="text-info text-sm">To grant admin access, create a document in the <code className="bg-base-300 px-1 py-0.5 rounded">admins</code> collection with this UID as the document ID.</p>
              {isDevelopment && (
                <button 
                  className="btn btn-info btn-sm mt-2"
                  onClick={async () => {
                    try {
                      // Create formatted instructions for setting up admin custom claim
                      const instructions = `
To add this user as an admin:

1. Make sure you have created a serviceAccount.json file in your project root:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the file as serviceAccount.json in your project root

2. Open the setup-admin.js file in your project root
3. Replace YOUR_USER_UID_HERE with this UID: ${currentUser.uid}
4. Run the script with: node setup-admin.js

After setting up the admin claim, refresh this page.
`;
                      
                      alert(instructions);
                      
                      // Copy the UID to clipboard for convenience
                      navigator.clipboard.writeText(currentUser.uid)
                        .then(() => console.log('UID copied to clipboard'))
                        .catch(err => console.error('Could not copy UID:', err));
                        
                    } catch (err) {
                      console.error('Error:', err);
                    }
                  }}
                >
                  Show Admin Setup Instructions
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="bg-error bg-opacity-10 border-l-4 border-error p-4 mb-6 rounded">
              <p className="text-error">{error}</p>
            </div>
          )}
          
          <div className="text-center mb-6">
            <p className="mb-4">Sign in with your Google account to access the admin panel.</p>
            <p className="text-sm text-xmas-mute mb-6">Only authorized administrators will be granted access.</p>
            
            <button 
              onClick={handleGoogleLogin} 
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
                      s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20
                      s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039
                      l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
                      c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
                      c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <button 
            onClick={() => navigate('/')}
            className="btn btn-link text-xmas-mute"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
