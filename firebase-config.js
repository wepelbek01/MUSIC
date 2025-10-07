// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyBDfaQX85AnWlN1DBwF3cbcgmG9uFQQNZQ",
  authDomain: "eoch-chat.firebaseapp.com",
  databaseURL: "https://eoch-chat-default-rtdb.firebaseio.com",
  projectId: "eoch-chat",
  storageBucket: "eoch-chat.firebasestorage.app",
  messagingSenderId: "1085672926287",
  appId: "1:1085672926287:web:2d0494d93d293a5bf58e3a",
  measurementId: "G-SFJ9NHSM2B",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const database = getDatabase(app)
