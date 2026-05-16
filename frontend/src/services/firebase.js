import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

 

//Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "ai-interview-simulator-ae0cc.firebaseapp.com",
  projectId: "ai-interview-simulator-ae0cc",
  storageBucket: "ai-interview-simulator-ae0cc.firebasestorage.app",
  messagingSenderId: "491260223848",
  appId: "1:491260223848:web:faeab5af5b87aa1c5db6dd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const db = getFirestore(app);

// Optional export for Firestore (Database) par exemple
// export default app;