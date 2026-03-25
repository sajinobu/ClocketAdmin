import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

// FIXED: Added getDocs, getDoc, updateDoc, deleteDoc, setDoc, writeBatch to the imports
import { getFirestore, collection, getDocs, query, where, doc, getDoc, onSnapshot, updateDoc, deleteDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// RTDB Imports
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCfdLYFSBXpwdcxLas9FxKKcLYALAa14PQ",
  authDomain: "clocket-appcase.firebaseapp.com",
  databaseURL: "https://clocket-appcase-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clocket-appcase",
  storageBucket: "clocket-appcase.firebasestorage.app",
  messagingSenderId: "579781749699",
  appId: "1:579781749699:web:5099b01738c474e403eb76",
  measurementId: "G-2GZ94KNTK6"
};

const app = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");

window.db = getFirestore(app);
window.auth = getAuth(app);
window.secondaryAuth = getAuth(secondaryApp);
window.rtdb = getDatabase(app); 

window.firebaseUtils = {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    writeBatch,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    ref,      
    onValue,  
    get,       
    onSnapshot
};

console.log("Firebase loaded globally via CDN! Ready for SPA.");