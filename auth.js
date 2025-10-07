import { auth } from "./firebase-config.js"
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
import { database } from "./firebase-config.js"
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

const googleSignInBtn = document.getElementById("googleSignInBtn")
const loading = document.getElementById("loading")

// Check if user is already logged in
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Check if user has completed profile setup
    const userRef = ref(database, `users/${user.uid}`)
    const snapshot = await get(userRef)

    if (snapshot.exists()) {
      // User has profile, redirect to chat
      window.location.href = "chat.html"
    } else {
      // User needs to setup profile
      window.location.href = "setup-profile.html"
    }
  }
})

// Google Sign In
googleSignInBtn.addEventListener("click", async () => {
  loading.classList.remove("hidden")
  googleSignInBtn.disabled = true

  const provider = new GoogleAuthProvider()

  try {
    const result = await signInWithPopup(auth, provider)
    console.log("[v0] User signed in:", result.user.email)
    // onAuthStateChanged will handle the redirect
  } catch (error) {
    console.error("[v0] Sign in error:", error)
    alert("Kirish xatosi: " + error.message)
    loading.classList.add("hidden")
    googleSignInBtn.disabled = false
  }
})
