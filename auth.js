import { auth } from "./firebase-config.js"
import {
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
import { database } from "./firebase-config.js"
import { ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

const googleSignInBtn = document.getElementById("googleSignInBtn")
const phoneForm = document.getElementById("phoneForm")
const verifyForm = document.getElementById("verifyForm")
const phoneNumberInput = document.getElementById("phoneNumber")
const verificationCodeInput = document.getElementById("verificationCode")
const sendCodeBtn = document.getElementById("sendCodeBtn")
const verifyCodeBtn = document.getElementById("verifyCodeBtn")
const resendCodeBtn = document.getElementById("resendCodeBtn")
const loading = document.getElementById("loading")

let confirmationResult = null
let recaptchaVerifier = null

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

function initRecaptcha() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: (response) => {
        console.log("[v0] reCAPTCHA solved")
      },
    })
  }
}

googleSignInBtn.addEventListener("click", async () => {
  loading.classList.remove("hidden")
  googleSignInBtn.disabled = true

  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    console.log("[v0] Google sign in successful:", result.user.email)
    // onAuthStateChanged will handle the redirect
  } catch (error) {
    console.error("[v0] Google sign in error:", error)
    alert("Google orqali kirishda xatolik: " + error.message)
    loading.classList.add("hidden")
    googleSignInBtn.disabled = false
  }
})

sendCodeBtn.addEventListener("click", async () => {
  const phoneNumber = phoneNumberInput.value.trim()

  if (!phoneNumber) {
    alert("Iltimos, telefon raqamingizni kiriting")
    return
  }

  if (!phoneNumber.startsWith("+")) {
    alert("Telefon raqam + belgisi bilan boshlanishi kerak (masalan: +998901234567)")
    return
  }

  loading.classList.remove("hidden")
  sendCodeBtn.disabled = true

  try {
    initRecaptcha()
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
    console.log("[v0] SMS sent successfully")

    phoneForm.classList.add("hidden")
    verifyForm.classList.remove("hidden")
    loading.classList.add("hidden")
  } catch (error) {
    console.error("[v0] SMS send error:", error)
    alert("SMS yuborishda xatolik: " + error.message)
    loading.classList.add("hidden")
    sendCodeBtn.disabled = false
  }
})

verifyCodeBtn.addEventListener("click", async () => {
  const code = verificationCodeInput.value.trim()

  if (!code || code.length !== 6) {
    alert("Iltimos, 6 raqamli kodni kiriting")
    return
  }

  loading.classList.remove("hidden")
  verifyCodeBtn.disabled = true

  try {
    const result = await confirmationResult.confirm(code)
    console.log("[v0] User signed in:", result.user.phoneNumber)
  } catch (error) {
    console.error("[v0] Verification error:", error)
    alert("Kod noto'g'ri. Iltimos, qaytadan urinib ko'ring.")
    loading.classList.add("hidden")
    verifyCodeBtn.disabled = false
  }
})

resendCodeBtn.addEventListener("click", () => {
  verifyForm.classList.add("hidden")
  phoneForm.classList.remove("hidden")
  verificationCodeInput.value = ""
  sendCodeBtn.disabled = false
})
