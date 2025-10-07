import { auth, database } from "./firebase-config.js"
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
import {
  ref,
  get,
  set,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"

let currentUser = null
let currentChatUser = null
let messagesListener = null

const currentUserAvatar = document.getElementById("currentUserAvatar")
const currentUserName = document.getElementById("currentUserName")
const currentUserNickname = document.getElementById("currentUserNickname")
const logoutBtn = document.getElementById("logoutBtn")
const searchInput = document.getElementById("searchInput")
const searchResults = document.getElementById("searchResults")
const chatList = document.getElementById("chatList")
const chatArea = document.getElementById("chatArea")
const activeChat = document.getElementById("activeChat")
const chatUserAvatar = document.getElementById("chatUserAvatar")
const chatUserName = document.getElementById("chatUserName")
const chatUserNickname = document.getElementById("chatUserNickname")
const messagesContainer = document.getElementById("messagesContainer")
const messageInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")

// Check authentication
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"
    return
  }

  // Get user profile
  const userRef = ref(database, `users/${user.uid}`)
  const snapshot = await get(userRef)

  if (!snapshot.exists()) {
    window.location.href = "setup-profile.html"
    return
  }

  currentUser = snapshot.val()

  // Display current user info
  currentUserAvatar.textContent = currentUser.avatar
  currentUserName.textContent = currentUser.displayName
  currentUserNickname.textContent = "@" + currentUser.nickname

  // Load chat list
  loadChatList()
})

// Logout
logoutBtn.addEventListener("click", async () => {
  if (confirm("Chiqishni xohlaysizmi?")) {
    await signOut(auth)
    window.location.href = "index.html"
  }
})

// Search users
let searchTimeout
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout)
  const searchTerm = searchInput.value.trim().toLowerCase()

  if (searchTerm.length < 2) {
    searchResults.classList.add("hidden")
    return
  }

  searchTimeout = setTimeout(async () => {
    await searchUsers(searchTerm)
  }, 300)
})

async function searchUsers(searchTerm) {
  const usersRef = ref(database, "users")
  const snapshot = await get(usersRef)

  if (!snapshot.exists()) {
    showNoResults()
    return
  }

  const users = []
  snapshot.forEach((child) => {
    const user = child.val()
    if (user.uid !== currentUser.uid && user.nickname.includes(searchTerm)) {
      users.push(user)
    }
  })

  if (users.length === 0) {
    showNoResults()
  } else {
    displaySearchResults(users)
  }
}

function showNoResults() {
  searchResults.innerHTML = '<div class="no-results">Afsuski, bunday foydalanuvchi topilmadi</div>'
  searchResults.classList.remove("hidden")
}

function displaySearchResults(users) {
  searchResults.innerHTML = ""

  users.forEach((user) => {
    const item = document.createElement("div")
    item.className = "search-result-item"
    item.innerHTML = `
      <div class="search-result-avatar">${user.avatar}</div>
      <div class="search-result-info">
        <div class="search-result-name">${user.displayName}</div>
        <div class="search-result-nickname">@${user.nickname}</div>
      </div>
    `
    item.addEventListener("click", () => {
      openChat(user)
      searchInput.value = ""
      searchResults.classList.add("hidden")
    })
    searchResults.appendChild(item)
  })

  searchResults.classList.remove("hidden")
}

// Close search results when clicking outside
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.add("hidden")
  }
})

// Load chat list
async function loadChatList() {
  const chatsRef = ref(database, `userChats/${currentUser.uid}`)

  onValue(chatsRef, async (snapshot) => {
    if (!snapshot.exists()) {
      chatList.innerHTML = '<p class="empty-state">Hali suhbatlar yo\'q. Foydalanuvchi qidiring!</p>'
      return
    }

    const chats = []
    for (const [chatId, chatData] of Object.entries(snapshot.val())) {
      const otherUserId = chatData.otherUserId
      const userRef = ref(database, `users/${otherUserId}`)
      const userSnapshot = await get(userRef)

      if (userSnapshot.exists()) {
        chats.push({
          chatId,
          user: userSnapshot.val(),
          lastMessage: chatData.lastMessage || "",
          timestamp: chatData.timestamp || 0,
        })
      }
    }

    // Sort by timestamp
    chats.sort((a, b) => b.timestamp - a.timestamp)

    displayChatList(chats)
  })
}

function displayChatList(chats) {
  chatList.innerHTML = ""

  chats.forEach((chat) => {
    const item = document.createElement("div")
    item.className = "chat-item"
    if (currentChatUser && currentChatUser.uid === chat.user.uid) {
      item.classList.add("active")
    }
    item.innerHTML = `
      <div class="chat-avatar">${chat.user.avatar}</div>
      <div class="chat-info">
        <div class="chat-name">${chat.user.displayName}</div>
        <div class="chat-last-message">${chat.lastMessage || "Xabar yo'q"}</div>
      </div>
    `
    item.addEventListener("click", () => openChat(chat.user))
    chatList.appendChild(item)
  })
}

// Open chat
function openChat(user) {
  currentChatUser = user

  // Update UI
  chatArea.style.display = "none"
  activeChat.classList.remove("hidden")

  chatUserAvatar.textContent = user.avatar
  chatUserName.textContent = user.displayName
  chatUserNickname.textContent = "@" + user.nickname

  // Update active chat in list
  document.querySelectorAll(".chat-item").forEach((item) => item.classList.remove("active"))

  // Load messages
  loadMessages(user.uid)
}

// Load messages
function loadMessages(otherUserId) {
  // Remove previous listener
  if (messagesListener) {
    messagesListener()
  }

  const chatId = getChatId(currentUser.uid, otherUserId)
  const messagesRef = ref(database, `messages/${chatId}`)
  const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(50))

  messagesListener = onValue(messagesQuery, (snapshot) => {
    messagesContainer.innerHTML = ""

    if (!snapshot.exists()) {
      return
    }

    snapshot.forEach((child) => {
      const message = child.val()
      displayMessage(message)
    })

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  })
}

function displayMessage(message) {
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${message.senderId === currentUser.uid ? "sent" : "received"}`

  const time = new Date(message.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })

  messageDiv.innerHTML = `
    <div>${message.text}</div>
    <div class="message-time">${time}</div>
  `

  messagesContainer.appendChild(messageDiv)
}

// Send message
async function sendMessage() {
  const text = messageInput.value.trim()

  if (!text || !currentChatUser) return

  const chatId = getChatId(currentUser.uid, currentChatUser.uid)
  const messagesRef = ref(database, `messages/${chatId}`)
  const newMessageRef = push(messagesRef)

  const message = {
    text,
    senderId: currentUser.uid,
    receiverId: currentChatUser.uid,
    timestamp: Date.now(),
  }

  try {
    await set(newMessageRef, message)

    // Update chat list for both users
    await updateChatList(currentUser.uid, currentChatUser.uid, chatId, text)
    await updateChatList(currentChatUser.uid, currentUser.uid, chatId, text)

    messageInput.value = ""
  } catch (error) {
    console.error("[v0] Send message error:", error)
    alert("Xabar yuborishda xatolik")
  }
}

async function updateChatList(userId, otherUserId, chatId, lastMessage) {
  const chatRef = ref(database, `userChats/${userId}/${chatId}`)
  await set(chatRef, {
    otherUserId,
    lastMessage,
    timestamp: Date.now(),
  })
}

function getChatId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`
}

// Send button click
sendBtn.addEventListener("click", sendMessage)

// Enter key to send
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage()
  }
})
