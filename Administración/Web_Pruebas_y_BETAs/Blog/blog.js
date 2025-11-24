import { firebaseConfig } from "../api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const main = document.querySelector("main");

async function cargarPosts() {
  try {
    const snapshot = await getDocs(collection(db, "blog"));
    const posts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    main.innerHTML = ""; // limpiar posts

    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <h2>${post.titulo}</h2>
        <div class="date">${new Date(post.fecha).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}</div>
        <p>${post.contenido}</p>
        ${
          post.enlace ? `<a href="${post.enlace}" target="_blank">Aquí</a>` : ""
        }
      `;
      main.appendChild(div);
    });
  } catch (err) {
    console.error("Error cargando posts:", err);
    main.innerHTML = "<p style='color:red;'>Error cargando posts</p>";
  }
}

cargarPosts();
