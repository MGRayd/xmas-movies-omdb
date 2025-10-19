import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyB0Qjs2dvrcJAZeWUd9SyPVnTXufRImsi4",
  authDomain: "xmas-quiz-8c02e.firebaseapp.com",
  projectId: "xmas-quiz-8c02e",
  storageBucket: "xmas-quiz-8c02e.firebasestorage.app",
  messagingSenderId: "978823764359",
  appId: "1:978823764359:web:dfbd31fbac09f62a82db22"
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
