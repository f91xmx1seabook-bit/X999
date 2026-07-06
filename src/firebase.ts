import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCyVu2ivl-CsOI3srXJBiSH5FbL9wi4l9c",
  authDomain: "x9999-72770.firebaseapp.com",
  projectId: "x9999-72770",
  storageBucket: "x9999-72770.firebasestorage.app",
  messagingSenderId: "860107447701",
  appId: "1:860107447701:web:3970acbec32edceb40aa9c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
