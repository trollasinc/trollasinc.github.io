// top_chat_main.js
// Requiere: ./top_chat_api.js exportando `firebaseConfig`
// HTML debe contener los ids usados abajo (ver conversación)

import { firebaseConfig } from "./top_chat_api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- Init Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // --- State
  let currentUser = null;
  let unsubChats = null; // unsub for chat list
  let unsubCurrentChat = null; // unsub for messages in currently open chat
  let currentMessagesColRef = null;

  // --- Helper to safe-get DOM elements
  const $ = (id) => document.getElementById(id);

  // --- DOM refs (must match your HTML)
  const menuBtn = $("menuBtn");
  const sidebar = $("chatSidebar");
  const chatList = $("chatList");
  const chatBox = $("chatBox");
  const chatHeader = $("chatHeader");
  const chatDiv = $("chatDiv");
  const overlay = $("overlay");

  // login popup
  const loginPopup = $("loginPopup");
  const emailInput = $("email");
  const passInput = $("pass");
  const registerBtn = $("registerBtn");
  const loginBtn = $("loginBtn");
  const logoutBtn = $("logoutBtn");
  const userEmailSpan = $("userEmail");

  // new chat popup
  const addChatBtn = $("addChatBtn");
  const newChatPopup = $("newChatPopup");
  const closePopupBtn = $("closePopupBtn");
  const createChatBtn = $("createChatBtn");
  const newChatEmail = $("newChatEmail");
  const chatFields = $("chatFields");
  const groupFields = $("groupFields");
  const groupNameInput = $("groupName");
  const groupMembersInput = $("groupMembers");

  // message input
  const msgInput = $("msg");
  const sendMsgBtn = $("sendMsgBtn");

  // Basic guards
  if (!chatList || !chatBox || !chatHeader) {
    console.error(
      "DOM: faltan elementos obligatorios (#chatList, #chatBox, #chatHeader). Revisa tu HTML."
    );
    return;
  }

  // --- UI helpers
  const showOverlay = (show) => {
    if (overlay) overlay.style.display = show ? "block" : "none";
  };
  const showPopup = (el, show) => {
    if (el) el.style.display = show ? "block" : "none";
  };

  // Sidebar toggle
  if (menuBtn && sidebar)
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("hidden"));

  // --- Auth actions
  if (registerBtn)
    registerBtn.addEventListener("click", async () => {
      const email = emailInput?.value?.trim();
      const pass = passInput?.value?.trim();
      if (!email || !pass) {
        alert("Error: email o contraseña vacíos");
        return;
      }
      try {
        await createUserWithEmailAndPassword(auth, email, pass);
      } catch (e) {
        console.error(e);
        alert("Error registro: " + (e.code || e.message));
      }
    });

  if (loginBtn)
    loginBtn.addEventListener("click", async () => {
      const email = emailInput?.value?.trim();
      const pass = passInput?.value?.trim();
      if (!email || !pass) {
        alert("Error: email o contraseña vacíos");
        return;
      }
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (e) {
        console.error(e);
        alert("Error login: " + (e.code || e.message));
      }
    });

  if (logoutBtn)
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (e) {
        console.error(e);
        alert("Error logout: " + (e.code || e.message));
      }
    });

  // --- New chat/group popup handlers
  if (addChatBtn)
    addChatBtn.addEventListener("click", () => {
      showPopup(newChatPopup, true);
      showOverlay(true);
    });
  if (closePopupBtn)
    closePopupBtn.addEventListener("click", () => {
      showPopup(newChatPopup, false);
      showOverlay(false);
    });

  // radio switching for chat/group (safe)
  const radioNodeList = document.getElementsByName("chatType");
  Array.from(radioNodeList || []).forEach((r) =>
    r.addEventListener("change", () => {
      if (!chatFields || !groupFields) return;
      chatFields.style.display =
        r.value === "chat" && r.checked ? "block" : "none";
      groupFields.style.display =
        r.value === "group" && r.checked ? "block" : "none";
    })
  );

  // --- Utility: compute 'other' email from chatId robustly (handles possible underscores)
  function otherEmailFromChatId(chatId, myEmail) {
    if (!chatId || !myEmail) return null;
    // common case: chatId = email1_email2 and only one _ used
    const double = myEmail + "_";
    const rev = "_" + myEmail;
    if (chatId.startsWith(double)) return chatId.slice(double.length);
    if (chatId.endsWith(rev)) return chatId.slice(0, -rev.length);
    // fallback: try split and assume one part equals myEmail
    const parts = chatId.split("_");
    const otherParts = parts.filter((p) => p !== myEmail);
    if (otherParts.length === 1) return otherParts[0];
    // last resort: return chatId but caller must handle
    return chatId;
  }

  // --- Create chat/group
  if (createChatBtn)
    createChatBtn.addEventListener("click", async () => {
      if (!currentUser) {
        alert("No autenticado");
        return;
      }
      const type =
        Array.from(radioNodeList || []).find((r) => r.checked)?.value || "chat";
      try {
        if (type === "chat") {
          const target = newChatEmail?.value?.trim();
          if (!target) {
            alert("Email destino vacío");
            return;
          }
          const chatId = [currentUser.email, target].sort().join("_");
          await setDoc(doc(db, "TOPCHAT_CHATS", chatId), {
            created: Date.now(),
          });
        } else {
          const name = groupNameInput?.value?.trim();
          const membersRaw = groupMembersInput?.value || "";
          const members = membersRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (!name || members.length === 0) {
            alert("Nombre o miembros vacíos");
            return;
          }
          if (!members.includes(currentUser.email))
            members.push(currentUser.email);
          const chatId = "group_" + Date.now();
          await setDoc(doc(db, "TOPCHAT_CHATS", chatId), {
            name,
            members,
            created: Date.now(),
          });
        }
        // reset + close
        if (newChatEmail) newChatEmail.value = "";
        if (groupNameInput) groupNameInput.value = "";
        if (groupMembersInput) groupMembersInput.value = "";
        showPopup(newChatPopup, false);
        showOverlay(false);
        // reload list will auto-update because onSnapshot active
      } catch (e) {
        console.error(e);
        alert("Error crear chat/grupo: " + (e.code || e.message));
      }
    });

  // --- Load chat list (real-time). unsub previous if any.
  function subscribeChatList() {
    if (unsubChats) unsubChats();
    const q = query(collection(db, "TOPCHAT_CHATS"));
    unsubChats = onSnapshot(
      q,
      (snapshot) => {
        chatList.innerHTML = "";
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const chatId = docSnap.id;

          // Group if members array exists
          if (Array.isArray(data.members)) {
            if (!currentUser) return;
            if (!data.members.includes(currentUser.email)) return; // not a member
            const li = document.createElement("li");
            li.className = "group-item";
            li.dataset.chatId = chatId;
            li.dataset.type = "group";
            li.textContent = data.name || chatId;

            // add-member button
            const addBtn = document.createElement("button");
            addBtn.className = "add-member-btn";
            addBtn.type = "button";
            addBtn.title = "Añadir miembro";
            addBtn.textContent = "+";
            addBtn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const email = prompt(
                "Introduce emails a añadir, separados por comas:"
              );
              if (!email) return;
              const newMembers = email
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (newMembers.length === 0) return;
              try {
                await updateDoc(doc(db, "TOPCHAT_CHATS", chatId), {
                  members: arrayUnion(...newMembers),
                });
              } catch (err) {
                console.error(err);
                alert("Error añadir miembros: " + (err.code || err.message));
              }
            });

            li.appendChild(addBtn);
            li.addEventListener("click", () =>
              openChat(chatId, true, data.name || chatId)
            );
            chatList.appendChild(li);
            return;
          }

          // Else: treat as 1:1 chat if ID contains user's email
          if (!currentUser) return;
          if (typeof chatId !== "string") return;
          if (!chatId.includes(currentUser.email)) return;
          const other = otherEmailFromChatId(chatId, currentUser.email);
          if (!other) return;
          const li = document.createElement("li");
          li.className = "chat-item";
          li.dataset.chatId = chatId;
          li.dataset.type = "chat";
          li.dataset.other = other;
          li.textContent = other;
          li.addEventListener("click", () => openChat(chatId, false, other));
          chatList.appendChild(li);
        });
      },
      (err) => {
        console.error("onSnapshot chats error:", err);
        // don't throw; UI remains empty
      }
    );
  }

  // --- Open chat (chatId is document id in TOPCHAT_CHATS)
  function openChat(chatId, isGroup, displayName) {
    if (!chatId) return;
    chatHeader.textContent = displayName || chatId;
    chatBox.innerHTML = "";

    // unsubscribe previous messages
    if (unsubCurrentChat) {
      try {
        unsubCurrentChat();
      } catch (e) {
        /*ignore*/
      }
      unsubCurrentChat = null;
    }
    currentMessagesColRef = collection(db, "TOPCHAT_CHATS", chatId, "messages");
    const q = query(currentMessagesColRef, orderBy("created"));

    unsubCurrentChat = onSnapshot(
      q,
      (snapshot) => {
        chatBox.innerHTML = "";
        snapshot.docs.forEach((docSnap) => {
          const msg = docSnap.data() || {};
          const text = msg.text || "";
          const sender = msg.sender || "";
          const bubble = document.createElement("div");
          bubble.className =
            "bubble " +
            (sender === (currentUser && currentUser.email) ? "self" : "other");
          bubble.textContent = (isGroup ? sender + ": " : "") + text;
          chatBox.appendChild(bubble);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
      },
      (err) => {
        console.error("onSnapshot messages error:", err);
      }
    );

    // set send handler (replace previous)
    if (sendMsgBtn) {
      sendMsgBtn.onclick = async () => {
        if (!currentUser) {
          alert("No autenticado");
          return;
        }
        const text = msgInput?.value?.trim();
        if (!text) return;
        try {
          await addDoc(currentMessagesColRef, {
            text,
            sender: currentUser.email,
            created: Date.now(),
          });
          if (msgInput) msgInput.value = "";
        } catch (e) {
          console.error(e);
          alert("Error enviar mensaje: " + (e.code || e.message));
        }
      };
    }
  }

  // --- Auth listener: show/hide login and subscribe/unsubscribe lists
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      if (loginPopup) loginPopup.style.display = "none";
      if (userEmailSpan) userEmailSpan.textContent = user.email || "";
      // ensure chatDiv visible
      if (chatDiv) chatDiv.style.display = "flex";
      subscribeChatList();
    } else {
      // show login popup
      if (loginPopup) loginPopup.style.display = "flex";
      if (userEmailSpan) userEmailSpan.textContent = "";
      if (chatDiv) chatDiv.style.display = "none";
      if (unsubChats) {
        try {
          unsubChats();
        } catch (e) {}
        unsubChats = null;
      }
      if (unsubCurrentChat) {
        try {
          unsubCurrentChat();
        } catch (e) {}
        unsubCurrentChat = null;
      }
      chatList.innerHTML = "";
      chatBox.innerHTML = "";
      chatHeader.textContent = "";
    }
  });

  // small defensive default: if already logged in when script loads
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    if (loginPopup) loginPopup.style.display = "none";
    if (userEmailSpan) userEmailSpan.textContent = currentUser.email || "";
    subscribeChatList();
  }
});
