// top_chat_main.js
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
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  let currentUser = null;
  let unsubChats = null;
  let unsubCurrentChat = null;
  let currentMessagesColRef = null;

  const $ = (id) => document.getElementById(id);

  // DOM
  const menuBtn = $("menuBtn"),
    sidebar = $("chatSidebar"),
    chatList = $("chatList"),
    chatBox = $("chatBox"),
    chatHeader = $("chatHeader"),
    chatDiv = $("chatDiv"),
    overlay = $("overlay");

  const loginPopup = $("loginPopup"),
    emailInput = $("email"),
    passInput = $("pass"),
    registerBtn = $("registerBtn"),
    loginBtn = $("loginBtn"),
    logoutBtn = $("logoutBtn"),
    userEmailSpan = $("userEmail");

  const addChatBtn = $("addChatBtn"),
    newChatPopup = $("newChatPopup"),
    closePopupBtn = $("closePopupBtn"),
    createChatBtn = $("createChatBtn"),
    newChatEmail = $("newChatEmail"),
    chatFields = $("chatFields"),
    groupFields = $("groupFields"),
    groupNameInput = $("groupName"),
    groupMembersInput = $("groupMembers");

  const msgInput = $("msg"),
    sendMsgBtn = $("sendMsgBtn");

  if (!chatList || !chatBox || !chatHeader) {
    console.error(
      "Faltan elementos obligatorios (#chatList, #chatBox, #chatHeader)."
    );
    return;
  }

  const showOverlay = (show) =>
    overlay && (overlay.style.display = show ? "block" : "none");
  const showPopup = (el, show) =>
    el && (el.style.display = show ? "block" : "none");

  if (menuBtn && sidebar)
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("hidden"));

  // --- Auth
  if (registerBtn)
    registerBtn.addEventListener("click", async () => {
      const email = emailInput?.value?.trim(),
        pass = passInput?.value?.trim();
      if (!email || !pass) return alert("Email o contraseña vacíos");
      try {
        await createUserWithEmailAndPassword(auth, email, pass);
      } catch (e) {
        console.error(e);
        alert("Error registro: " + (e.code || e.message));
      }
    });

  if (loginBtn)
    loginBtn.addEventListener("click", async () => {
      const email = emailInput?.value?.trim(),
        pass = passInput?.value?.trim();
      if (!email || !pass) return alert("Email o contraseña vacíos");
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

  // --- Chat / Group Popup
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

  function otherEmailFromChatId(chatId, myEmail) {
    if (!chatId || !myEmail) return null;
    const double = myEmail + "_";
    const rev = "_" + myEmail;
    if (chatId.startsWith(double)) return chatId.slice(double.length);
    if (chatId.endsWith(rev)) return chatId.slice(0, -rev.length);
    const parts = chatId.split("_");
    const otherParts = parts.filter((p) => p !== myEmail);
    if (otherParts.length === 1) return otherParts[0];
    return chatId;
  }

  if (createChatBtn)
    createChatBtn.addEventListener("click", async () => {
      if (!currentUser) return alert("No autenticado");
      const type =
        Array.from(radioNodeList || []).find((r) => r.checked)?.value || "chat";
      try {
        if (type === "chat") {
          const target = newChatEmail?.value?.trim();
          if (!target) return alert("Email destino vacío");
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
          if (!name || members.length === 0)
            return alert("Nombre o miembros vacíos");
          if (!members.includes(currentUser.email))
            members.push(currentUser.email);
          const chatId = "group_" + Date.now();
          await setDoc(doc(db, "TOPCHAT_CHATS", chatId), {
            name,
            members,
            created: Date.now(),
          });
        }
        if (newChatEmail) newChatEmail.value = "";
        if (groupNameInput) groupNameInput.value = "";
        if (groupMembersInput) groupMembersInput.value = "";
        showPopup(newChatPopup, false);
        showOverlay(false);
      } catch (e) {
        console.error(e);
        alert("Error crear chat/grupo: " + (e.code || e.message));
      }
    });

  // --- Notifications
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission().then((perm) =>
      console.log("Permiso notificaciones:", perm)
    );
  }

  function updateBadge(li, count) {
    if (!li) return;
    let badge = li.querySelector(".unread-badge");
    if (count === 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.style.cssText = `
        background:#007bff;color:white;font-size:12px;
        border-radius:50%;padding:2px 6px;margin-left:5px;
      `;
      li.appendChild(badge);
    }
    badge.textContent = count;
  }

  function subscribeChat(chatId, li) {
    const messagesCol = collection(db, "TOPCHAT_CHATS", chatId, "messages");
    const q = query(messagesCol, orderBy("created"));
    return onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.docs.forEach((docSnap) => {
        const msg = docSnap.data();
        if (!msg.readBy) msg.readBy = [];
        if (
          !msg.readBy.includes(currentUser.email) &&
          msg.sender !== currentUser.email
        ) {
          unreadCount++;
          if (Notification.permission === "granted") {
            new Notification(`Nuevo mensaje de ${msg.sender}`, {
              body: msg.text,
            });
          }
        }
      });
      updateBadge(li, unreadCount);
    });
  }

  function subscribeAllChats() {
    chatList.querySelectorAll("li").forEach((li) => {
      const chatId = li.dataset.chatId;
      if (!chatId) return;
      const unsub = subscribeChat(chatId, li);
      li.addEventListener("click", async () => {
        const messagesCol = collection(db, "TOPCHAT_CHATS", chatId, "messages");
        const snapshot = await (
          await import(
            "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js"
          )
        ).getDocs(messagesCol);
        snapshot.docs.forEach(async (docSnap) => {
          const msgRef = doc(
            db,
            "TOPCHAT_CHATS",
            chatId,
            "messages",
            docSnap.id
          );
          const msgData = docSnap.data();
          if (!msgData.readBy) msgData.readBy = [];
          if (!msgData.readBy.includes(currentUser.email)) {
            await updateDoc(msgRef, { readBy: arrayUnion(currentUser.email) });
          }
        });
        updateBadge(li, 0);
      });
    });
  }

  function openChat(chatId, isGroup, displayName) {
    if (!chatId) return;
    chatHeader.textContent = displayName || chatId;
    chatBox.innerHTML = "";

    if (unsubCurrentChat) {
      try {
        unsubCurrentChat();
      } catch (e) {}
      unsubCurrentChat = null;
    }

    currentMessagesColRef = collection(db, "TOPCHAT_CHATS", chatId, "messages");
    const q = query(currentMessagesColRef, orderBy("created"));

    unsubCurrentChat = onSnapshot(q, (snapshot) => {
      chatBox.innerHTML = "";
      snapshot.docs.forEach((docSnap) => {
        const msg = docSnap.data() || {};
        const text = msg.text || "";
        const sender = msg.sender || "";
        const bubble = document.createElement("div");
        bubble.className =
          "bubble " + (sender === currentUser.email ? "self" : "other");
        bubble.textContent = (isGroup ? sender + ": " : "") + text;
        chatBox.appendChild(bubble);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });

    if (sendMsgBtn) {
      sendMsgBtn.onclick = async () => {
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

  onAuthStateChanged(auth, (user) => {
    currentUser = user;

    if (user) {
      if (loginPopup) loginPopup.style.display = "none";
      if (userEmailSpan) userEmailSpan.textContent = user.email || "";
      if (chatDiv) chatDiv.style.display = "flex";

      // cargar lista de chats
      if (unsubChats) unsubChats();
      const q = query(collection(db, "TOPCHAT_CHATS"));
      unsubChats = onSnapshot(q, (snapshot) => {
        chatList.innerHTML = "";
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const chatId = docSnap.id;

          let li;
          if (Array.isArray(data.members)) {
            if (!data.members.includes(currentUser.email)) return;
            li = document.createElement("li");
            li.className = "group-item";
            li.dataset.chatId = chatId;
            li.dataset.type = "group";
            li.textContent = data.name || chatId;

            const addBtn = document.createElement("button");
            addBtn.className = "add-member-btn";
            addBtn.type = "button";
            addBtn.textContent = "+";
            addBtn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const email = prompt("Emails a añadir, separados por comas:");
              if (!email) return;
              const newMembers = email
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (newMembers.length === 0) return;
              await updateDoc(doc(db, "TOPCHAT_CHATS", chatId), {
                members: arrayUnion(...newMembers),
              });
            });
            li.appendChild(addBtn);
          } else {
            if (!chatId.includes(currentUser.email)) return;
            const other = otherEmailFromChatId(chatId, currentUser.email);
            if (!other) return;
            li = document.createElement("li");
            li.className = "chat-item";
            li.dataset.chatId = chatId;
            li.dataset.type = "chat";
            li.dataset.other = other;
            li.textContent = other;
          }

          li.addEventListener("click", () =>
            openChat(
              chatId,
              Array.isArray(data.members),
              data.name || li.textContent
            )
          );
          chatList.appendChild(li);
        });
        subscribeAllChats();
      });
    } else {
      if (loginPopup) loginPopup.style.display = "flex";
      if (userEmailSpan) userEmailSpan.textContent = "";
      if (chatDiv) chatDiv.style.display = "none";

      if (unsubChats) {
        unsubChats();
        unsubChats = null;
      }
      if (unsubCurrentChat) {
        unsubCurrentChat();
        unsubCurrentChat = null;
      }

      chatList.innerHTML = "";
      chatBox.innerHTML = "";
    }
  });
});
