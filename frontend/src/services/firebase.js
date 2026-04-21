import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBz6ifQGKvz-EXdTt2s5cSnvyEIeFcJ6dw",
  authDomain: "ai-interview-simulator-ae0cc.firebaseapp.com",
  projectId: "ai-interview-simulator-ae0cc",
  storageBucket: "ai-interview-simulator-ae0cc.firebasestorage.app",
  messagingSenderId: "491260223848",
  appId: "1:491260223848:web:faeab5af5b87aa1c5db6dd"
};
// const firebaseConfig = {
//   apiKey: "xxx",
//   authDomain: "xxx",
//   projectId: "xxx",
//   storageBucket: "xxx",
//   messagingSenderId: "xxx",
//   appId: "xxx"
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Optional export for Firestore (Database) par exemple
// export default app;