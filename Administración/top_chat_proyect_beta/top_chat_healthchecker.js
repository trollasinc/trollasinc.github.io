// top_chat_health_checker.js
import { firebaseConfig } from "./top_chat_api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✨ Configura tus emails y contraseña
const HEALTH_CHECKER_EMAIL = "health_checker@test.com";
const HEALTH_CHECKER_PASS = "health_checker_TInc";
const TARGET_EMAIL = "trollasinc2024@gmail.com";
let healthInterval = null;

// Función para enviar mensaje
async function sendHealthCheck(msg) {
  if (!auth.currentUser) return; // no enviar si logout
  try {
    const chatId = [HEALTH_CHECKER_EMAIL, TARGET_EMAIL].sort().join("_");
    await addDoc(collection(db, "TOPCHAT_CHATS", chatId, "messages"), {
      text: msg,
      sender: HEALTH_CHECKER_EMAIL,
      created: Date.now(),
    });
    console.log("Mensaje enviado ✅", msg);
  } catch (err) {
    console.error("No se pudo enviar mensaje:", err.code || err.message);
  }
}

// Manejo global de errores
function setupGlobalErrorHandlers() {
  window.onerror = async (msg, url, line, col, error) => {
    const errMsg = `JS Error: ${msg} at ${url}:${line}:${col} ${
      error ? error.stack : ""
    }`;
    await sendHealthCheck(errMsg);
    return false;
  };
  window.onunhandledrejection = async (event) => {
    const errMsg = `UnhandledPromise: ${
      event.reason ? event.reason.stack || event.reason : event.reason
    }`;
    await sendHealthCheck(errMsg);
  };
}

// Función principal
async function startHealthChecker() {
  const confirmStart = confirm("¿Quieres iniciar sesión como health checker?");
  if (!confirmStart) return console.log("Health checker cancelado ❌");

  try {
    await signInWithEmailAndPassword(
      auth,
      HEALTH_CHECKER_EMAIL,
      HEALTH_CHECKER_PASS
    );
    console.log("Health checker logueado ✅");

    setupGlobalErrorHandlers();

    // Detener cualquier intervalo previo
    if (healthInterval) clearInterval(healthInterval);

    // Enviar primer mensaje inmediatamente
    sendHealthCheck("health_checker: ok");

    // Iniciar envío periódico cada 5s
    healthInterval = setInterval(
      () => sendHealthCheck("health_checker: ok"),
      5000
    );

    // Detener health checker si se cierra sesión
    onAuthStateChanged(auth, (user) => {
      if (!user && healthInterval) {
        clearInterval(healthInterval);
        healthInterval = null;
        console.log("Health checker detenido por logout ✅");
      }
    });
  } catch (err) {
    console.error("Error login health checker:", err.code || err.message);
  }
}

// Exponer función global para usar desde consola
window.health_checker = startHealthChecker;
console.log("Para iniciar el health checker utiliza: health_checker()");
