// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCzAwcoto4zJhga2s5-xMyuj8FuHkcJg2s",
  authDomain: "csci614-2d30b.firebaseapp.com",
  projectId: "csci614-2d30b",
  storageBucket: "csci614-2d30b.firebasestorage.app",
  messagingSenderId: "573407903011",
  appId: "1:573407903011:web:dc913ffadc7b040c81a096",
  measurementId: "G-VKMMNGGZBM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const taskdata = collection(db, "tasklist");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;