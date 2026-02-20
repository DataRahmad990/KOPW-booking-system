import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCYC32MqMFkLWR5HtCGElUmIsqyV4OeS00",
  authDomain: "kopw-booking-system.firebaseapp.com",
  projectId: "kopw-booking-system",
  storageBucket: "kopw-booking-system.firebasestorage.app",
  messagingSenderId: "612412421801",
  appId: "1:612412421801:web:6cbefa30e8d7a9d0a69bb8",
  measurementId: "G-9DRJRP852G"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };