import { firebaseConfig } from "../api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Popup y LocalStorage ---
const modal = document.getElementById("emailModal");
const submitBtn = document.getElementById("submitEmail");
const emailInput = document.getElementById("userEmail");

// Si no hay correo en localStorage, mostrar modal
if (!localStorage.getItem("correoGuardado")) {
  modal.style.display = "block";
}

submitBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (email && /\S+@\S+\.\S+/.test(email)) {
    try {
      // Guardar en Firestore
      await addDoc(collection(db, "correos"), {
        correo: email,
        fecha: new Date(),
      });
      // Guardar en localStorage
      localStorage.setItem("correoGuardado", "true");
      // Ocultar modal
      modal.style.display = "none";
    } catch (error) {
      alert("Error al enviar el correo: " + error);
    }
  } else {
    alert("Por favor, introduce un correo válido.");
  }
});

// Opcional: evitar cerrar modal con clic fuera
window.addEventListener("click", (e) => {
  if (e.target == modal) {
    e.preventDefault();
  }
});
