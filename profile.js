import { auth, database } from "./firebase-config.js"
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
import {
  ref,
  set,
  get,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

const avatarGrid = document.getElementById("avatarGrid")
const nicknameInput = document.getElementById("nickname")
const nicknameError = document.getElementById("nicknameError")
const nicknameSuccess = document.getElementById("nicknameSuccess")
const profileForm = document.getElementById("profileForm")
const submitBtn = document.getElementById("submitBtn")
const loading = document.getElementById("loading")

let selectedAvatar = null
let currentUser = null

// Avatar options
const avatars = ["😀", "😎", "🤓", "😊", "🥳", "🤩", "😇", "🙂", "😄", "😁", "🤗", "🥰"]

// Generate avatar options
avatars.forEach((emoji) => {
  const avatarBtn = document.createElement("button")
  avatarBtn.type = "button"
  avatarBtn.className = "avatar-option"
  avatarBtn.textContent = emoji
  avatarBtn.addEventListener("click", () => {
    document.querySelectorAll(".avatar-option").forEach((btn) => btn.classList.remove("selected"))
    avatarBtn.classList.add("selected")
    selectedAvatar = emoji
  })
  avatarGrid.appendChild(avatarBtn)
})

// Select first avatar by default
avatarGrid.firstChild.classList.add("selected")
selectedAvatar = avatars[0]

// Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"
    return
  }

  currentUser = user

  // Check if user already has profile
  const userRef = ref(database, `users/${user.uid}`)
  const snapshot = await get(userRef)

  if (snapshot.exists()) {
    window.location.href = "chat.html"
  }
})

// Check nickname availability
let checkTimeout
nicknameInput.addEventListener("input", () => {
  clearTimeout(checkTimeout)
  nicknameError.classList.add("hidden")
  nicknameSuccess.classList.add("hidden")

  const nickname = nicknameInput.value.trim().toLowerCase()

  if (nickname.length < 3) return

  checkTimeout = setTimeout(async () => {
    const nicknamesRef = ref(database, "nicknames")
    const nicknameQuery = query(nicknamesRef, orderByChild("nickname"), equalTo(nickname))
    const snapshot = await get(nicknameQuery)

    if (snapshot.exists()) {
      nicknameError.textContent = "Bu nickname band. Boshqa tanlang."
      nicknameError.classList.remove("hidden")
    } else {
      nicknameSuccess.textContent = "Bu nickname mavjud!"
      nicknameSuccess.classList.remove("hidden")
    }
  }, 500)
})

// Submit profile
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  if (!selectedAvatar) {
    alert("Avatar tanlang!")
    return
  }

  const nickname = nicknameInput.value.trim().toLowerCase()

  if (nickname.length < 3 || nickname.length > 20) {
    alert("Nickname 3-20 ta belgi bo'lishi kerak!")
    return
  }

  loading.classList.remove("hidden")
  submitBtn.disabled = true

  try {
    // Check nickname availability one more time
    const nicknamesRef = ref(database, "nicknames")
    const nicknameQuery = query(nicknamesRef, orderByChild("nickname"), equalTo(nickname))
    const snapshot = await get(nicknameQuery)

    if (snapshot.exists()) {
      alert("Bu nickname band. Boshqa tanlang.")
      loading.classList.add("hidden")
      submitBtn.disabled = false
      return
    }

    // Save user profile
    const userRef = ref(database, `users/${currentUser.uid}`)
    await set(userRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || "User",
      nickname: nickname,
      avatar: selectedAvatar,
      createdAt: Date.now(),
    })

    // Save nickname mapping
    const nicknameRef = ref(database, `nicknames/${nickname}`)
    await set(nicknameRef, {
      nickname: nickname,
      uid: currentUser.uid,
    })

    console.log("[v0] Profile created successfully")
    window.location.href = "chat.html"
  } catch (error) {
    console.error("[v0] Profile creation error:", error)
    alert("Xatolik yuz berdi: " + error.message)
    loading.classList.add("hidden")
    submitBtn.disabled = false
  }
})
