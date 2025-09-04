import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if all required environment variables are set
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`
    *******************************************************************************
    * FIREBASE CONFIGURATION ERROR                                                *
    * --------------------------------------------------------------------------- *
    * Missing environment variables: ${missingEnvVars.join(', ')}
    * 
    * Please create a .env file in the project root with the following variables:
    * VITE_FIREBASE_API_KEY=your_api_key_here
    * VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    * VITE_FIREBASE_PROJECT_ID=your_project_id_here
    * VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    * VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
    * VITE_FIREBASE_APP_ID=your_app_id_here
    *
    * You can find these values in Firebase Console > Project Settings > General
    * The application will not connect to Firebase until this is corrected.       *
    *******************************************************************************
  `);
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };