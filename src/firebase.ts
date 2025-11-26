import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyD5-h96WDy4SzuP1XqClyBbpd1CL_tNZQw",
  authDomain: "my-xmas-movies.firebaseapp.com",
  projectId: "my-xmas-movies",
  storageBucket: "my-xmas-movies.firebasestorage.app",
  messagingSenderId: "534280822678",
  appId: "1:534280822678:web:5e91b52cb61b7ed71a47b7"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Set up Google Auth Provider with custom parameters
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  // Force account selection even when one account is available
  prompt: 'select_account'
})
export const provider = googleProvider
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
