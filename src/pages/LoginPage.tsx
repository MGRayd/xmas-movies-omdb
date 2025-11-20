import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading, error, signInWithGoogle } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && !isLoading) {
      navigate('/');
    }
  }, [currentUser, isLoading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // Redirect will happen via the useEffect
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  if (isLoading) {
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
          <h1 className="font-christmas text-4xl text-xmas-line mb-2">Christmas Movie Database</h1>
          <p className="text-xmas-mute">Sign in to manage your Christmas movie collection</p>
        </div>
        
        <div className="bg-xmas-card rounded-lg shadow-lg p-6">
          {error && (
            <div className="bg-error bg-opacity-10 border-l-4 border-error p-4 mb-6 rounded">
              <p className="text-error">{error}</p>
            </div>
          )}
          
          <div className="text-center mb-6">
            <p className="mb-4">Sign in with your Google account to access your Christmas movie collection.</p>
            <p className="text-sm text-xmas-mute mb-6">Track, rate, and discover Christmas movies!</p>
            
            <button 
              onClick={handleGoogleLogin} 
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
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
            </button>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-sm text-xmas-mute">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
