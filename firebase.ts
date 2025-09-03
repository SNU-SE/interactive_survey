// FIX: Corrected the Firebase v8 compat import.
// The namespace import (`import * as firebase`) was incorrect for the compat library.
// Using a default import (`import firebase from ...`) correctly loads the Firebase SDK.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// --- URGENT ACTION REQUIRED ---
// Replace the placeholder values below with your actual Firebase project configuration.
// You can find this in the Firebase console:
// Project settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <--- REPLACE
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // <--- REPLACE
  projectId: "YOUR_PROJECT_ID", // <--- REPLACE
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // <--- REPLACE
  messagingSenderId: "YOUR_SENDER_ID", // <--- REPLACE
  appId: "YOUR_APP_ID" // <--- REPLACE
};

// Check if the config is still using placeholder values
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  // We can't throw an error here as it would stop the app from rendering at all.
  // Instead, we log a very clear error message to the console.
  console.error(`
    *******************************************************************************
    * FIREBASE CONFIGURATION ERROR                                                *
    * --------------------------------------------------------------------------- *
    * Please open 'firebase.ts' and replace the placeholder configuration         *
    * with your actual Firebase project credentials.                              *
    * The application will not connect to Firebase until this is corrected.       *
    *******************************************************************************
  `);
}

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();

export { db, storage };