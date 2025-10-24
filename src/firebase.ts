// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1UihhSWi0Q3yvfmTWyqaG30jQkJZXHAM",
  authDomain: "localhost-b5ee6.firebaseapp.com",
  projectId: "localhost-b5ee6",
  storageBucket: "localhost-b5ee6.firebasestorage.app",
  messagingSenderId: "558121772975",
  appId: "1:558121772975:web:dc3556e70bfd020137715a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
