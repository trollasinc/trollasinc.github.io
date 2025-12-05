import { firebaseConfig } from "./api.js";
import { firebaseConfig as HC_CONFIG } from "./Administración/top_chat_proyect_beta/top_chat_api.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Overlay de error (bloqueante) ---
function showErrorOverlay({ title = "Error", message = "", code = "" } = {}) {
  try {
    // remover listeners previos
    window.removeEventListener("error", globalErrorHandler);
    window.removeEventListener("unhandledrejection", globalRejectionHandler);

    // bloquear scroll
    document.documentElement.style.overflow = "hidden";
    document.body.innerHTML = "";

    // overlay fondo oscuro semi-transparente
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "linear-gradient( #ffffffff, #c0c0c0ff)";
    overlay.style.zIndex = "999999";
    overlay.style.fontFamily = "'Segoe UI', Roboto, Helvetica, sans-serif";

    // panel neumorfismo cristal
    const card = document.createElement("div");
    card.style.background = "rgba(255,255,255,0.95)";
    card.style.borderRadius = "20px";
    card.style.padding = "30px";
    card.style.boxShadow =
      "8px 8px 24px rgba(0,0,0,0.2), -8px -8px 24px rgba(255,255,255,0.7)";
    card.style.backdropFilter = "blur(10px)"; // efecto cristal
    card.style.maxWidth = "600px";
    card.style.width = "90%";
    card.style.textAlign = "center";
    card.style.border = "1px solid rgba(255,255,255,0.3)";

    // título
    const h1 = document.createElement("h1");
    h1.textContent = title;
    h1.style.marginBottom = "12px";
    h1.style.fontSize = "22px";
    h1.style.fontWeight = "700";
    card.style.color = "black";

    // mensaje
    const p = document.createElement("pre");
    p.style.whiteSpace = "pre-wrap";
    p.style.fontSize = "14px";
    p.style.lineHeight = "1.4";
    p.style.marginBottom = "16px";
    p.textContent = message;
    card.style.color = "yellow";

    // código opcional
    const codeEl = document.createElement("div");
    codeEl.style.opacity = "0.9";
    codeEl.style.fontSize = "12px";
    codeEl.style.marginBottom = "16px";
    codeEl.textContent = code ? `Código: ${code}` : "";
    card.style.color = "";

    // botón recargar
    const btn = document.createElement("button");
    btn.textContent = "Recargar página";
    btn.onclick = () => location.reload();
    btn.style.padding = "10px 22px";
    btn.style.borderRadius = "12px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.background = "#ffffff";
    btn.style.color = "#ff1744";
    btn.style.fontWeight = "600";
    btn.style.fontSize = "14px";
    btn.style.boxShadow =
      "4px 4px 10px rgba(0,0,0,0.2), -4px -4px 10px rgba(255,255,255,0.7)"; // neumorfismo
    btn.style.transition = "all 0.2s ease";
    btn.onmouseover = () => {
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow =
        "6px 6px 12px rgba(0,0,0,0.25), -6px -6px 12px rgba(255,255,255,0.75)";
    };
    btn.onmouseout = () => {
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow =
        "4px 4px 10px rgba(0,0,0,0.2), -4px -4px 10px rgba(255,255,255,0.7)";
    };

    // añadir elementos
    card.appendChild(h1);
    card.appendChild(p);
    if (code) card.appendChild(codeEl);
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  } catch (err) {
    document.open();
    document.write(
      "<pre style='color:red;margin:20%;font-family:monospace;'>Error crítico: " +
        (err && err.message ? err.message : String(err)) +
        "</pre>"
    );
    document.close();
  }
}
// --- Handlers globales para capturar errores ---
function globalErrorHandler(event) {
  try {
    const msg = event && event.message ? event.message : String(event);
    const src =
      event && event.filename ? `${event.filename}:${event.lineno || "?"}` : "";
    showErrorOverlay({
      title: "Error JavaScript",
      message: `${msg}\n\n${src}`,
      code: "JS_ERROR",
    });
  } catch (e) {
    showErrorOverlay({
      title: "Error desconocido",
      message: String(event),
      code: "UNKNOWN",
    });
  }
}
function globalRejectionHandler(event) {
  const reason = event && event.reason ? event.reason : event;
  let message =
    typeof reason === "string"
      ? reason
      : reason && reason.message
      ? reason.message
      : JSON.stringify(reason);
  showErrorOverlay({
    title: "Promise rechazada",
    message,
    code: "UNHANDLED_REJECTION",
  });
}
window.addEventListener("error", globalErrorHandler);
window.addEventListener("unhandledrejection", globalRejectionHandler);

// --- Generar ID único por visitante ---
function obtenerVisitanteID() {
  let id = localStorage.getItem("visitanteID");
  if (!id) {
    id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("visitanteID", id);
  }
  return id;
}

// --- Contar visita solo una vez por dispositivo ---
async function contarVisitaUnaVez() {
  const yaVisito = localStorage.getItem("yaVisito");
  if (yaVisito) return;
  try {
    const visitasRef = doc(db, "estadisticas", "visitas");
    const visitasSnap = await getDoc(visitasRef);

    if (!visitasSnap.exists()) {
      await setDoc(visitasRef, { contador: 1 });
    } else {
      await updateDoc(visitasRef, { contador: increment(1) });
    }

    localStorage.setItem("yaVisito", "true");
  } catch (err) {
    // detectar 429 o límites
    const msg = err && err.message ? err.message : String(err);
    const code = err && err.code ? err.code : "";
    if (
      /429|Too Many Requests|rate/i.test(msg) ||
      /resource-exhausted/i.test(code)
    ) {
      showErrorOverlay({
        title: "Límite alcanzado (429)",
        message: "Hemos recibido muchas solicitudes. Inténtalo más tarde.",
        code: "RATE_LIMIT_429",
      });
      return;
    }
    // si hay otro error, mostrar y bloquear
    showErrorOverlay({
      title: "Error registro visitas",
      message: msg,
      code: code || "VISIT_REG_ERROR",
    });
  }
}

// --- Obtener información del dispositivo ---
function obtenerInfoDispositivo() {
  const ua = navigator.userAgent || "";

  let so = "Desconocido";
  if (/Android/i.test(ua)) so = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) so = "iOS";
  else if (/Windows/i.test(ua)) so = "Windows";
  else if (/Mac/i.test(ua)) so = "MacOS";
  else if (/Linux/i.test(ua)) so = "Linux";

  let navegador = "Desconocido";
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) navegador = "Chrome";
  else if (/Firefox/i.test(ua)) navegador = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = "Safari";
  else if (/Edge/i.test(ua)) navegador = "Edge";
  else if (/OPR|Opera/i.test(ua)) navegador = "Opera";

  const dispositivo = /Android|iPhone|iPad|iPod/i.test(ua) ? "Móvil" : "PC";
  const resolucion = `${window.innerWidth}x${window.innerHeight}`;
  const idioma = navigator.language || navigator.userLanguage || "";

  return { so, navegador, dispositivo, resolucion, idioma };
}

// --- Registrar visita y ban IP temporal ---
async function registrarVisita(ipData) {
  try {
    const ip = ipData.ip || "";
    const ahora = new Date();

    // --- Verificar IP baneada temporal (query en lugar de traer todo) ---
    let baneada = false;
    try {
      if (ip) {
        const q = query(collection(db, "ip_bans"), where("ip", "==", ip));
        const bansSnap = await getDocs(q);
        baneada = bansSnap.docs.some((docSnap) => {
          const data = docSnap.data();
          const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
          return data.ip === ip && (!expiresAt || expiresAt > ahora);
        });
      }
    } catch (qerr) {
      // error al consultar bans: mostrar y bloquear
      showErrorOverlay({
        title: "Error al verificar IP",
        message: qerr.message || String(qerr),
        code: "IP_BANS_QUERY_ERROR",
      });
      return;
    }

    if (baneada) {
      showErrorOverlay({
        title: "Acceso denegado",
        message:
          "Error 403. Tu IP ha sido bloqueada por uno de nuestros administradores",
        code: "IP_BANNED",
      });
      return;
    }

    // --- Contar visita ---
    await contarVisitaUnaVez();

    // --- Información completa ---
    const infoDispositivo = obtenerInfoDispositivo();
    const infoCompleta = {
      visitanteID: obtenerVisitanteID(),
      timestamp: new Date().toISOString(),
      ip,
      ciudad: ipData.city || "",
      pais: ipData.country_name || "",
      so: infoDispositivo.so,
      navegador: infoDispositivo.navegador,
      dispositivo: infoDispositivo.dispositivo,
      resolucion: infoDispositivo.resolucion,
      idioma: infoDispositivo.idioma,
      referrer: document.referrer || "",
      page: location.pathname + location.search || "",
    };

    await addDoc(collection(db, "visitas_detalle"), infoCompleta);
    console.log("Visita registrada:", infoCompleta);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const code = err && err.code ? err.code : "";
    // tratar 429 específicamente
    if (
      /429|Too Many Requests|rate/i.test(msg) ||
      /resource-exhausted/i.test(code)
    ) {
      showErrorOverlay({
        title: "Límite alcanzado (429)",
        message: "Hemos recibido muchas solicitudes. Inténtalo más tarde.",
        code: "RATE_LIMIT_429",
      });
      return;
    }
    showErrorOverlay({
      title: "Error registrando visita",
      message: msg,
      code: code || "REGISTER_VISIT_ERROR",
    });
  }
}

// --- JSONP ipapi.co con timeout y onerror ---
window.manejarIP = function (data) {
  // limpiar timeout si llegó la respuesta
  if (window.__ipapi_timeout_id) {
    clearTimeout(window.__ipapi_timeout_id);
    window.__ipapi_timeout_id = null;
  }
  registrarVisita(data);
};

(function loadIPApiJSONP() {
  const script = document.createElement("script");
  script.src = "https://ipapi.co/jsonp/?callback=manejarIP";
  script.async = true;

  // manejo onerror
  script.onerror = function () {
    showErrorOverlay({
      title: "Error obteniendo IP",
      message: "No se pudo cargar el servicio de geolocalización (ipapi.co).",
      code: "IPAPI_LOAD_ERROR",
    });
  };

  // timeout: si no responde en X ms, mostrar error bloqueante
  window.__ipapi_timeout_id = setTimeout(() => {
    window.__ipapi_timeout_id = null;
    showErrorOverlay({
      title: "Servicio no disponible",
      message:
        "La consulta de IP no respondió. Comprueba tu conexión o el servicio externo.",
      code: "IPAPI_TIMEOUT",
    });
  }, 10000); // 10s

  document.body.appendChild(script);
  // ---------------- Health Checker ----------------
  const hcApp = initializeApp(HC_CONFIG, "hcApp"); // app separada
  const authHC = getAuth(hcApp);
  const dbHC = getFirestore(hcApp);

  const HEALTH_EMAIL = "health_checker_web@test.com";
  const HEALTH_PASS = "health_checker_TInc";
  const TARGET_EMAIL = "trollasinc2024@gmail.com";

  let healthInterval = null;

  async function health_checker() {
    if (document.querySelector("div[style*='z-index: 999999']")) {
      console.warn("Overlay bloqueante activo, health checker no se inicia.");
      return;
    }

    try {
      // Login health checker
      await signInWithEmailAndPassword(authHC, HEALTH_EMAIL, HEALTH_PASS);
      console.log("Health checker logueado ✅");

      // Limpiar interval anterior
      if (healthInterval) clearInterval(healthInterval);

      const enviarOK = async () => {
        try {
          // Referencia al chat principal
          const chatId = [HEALTH_EMAIL, TARGET_EMAIL].sort().join("_");
          const chatRef = doc(dbHC, "TOPCHAT_CHATS", chatId); // doc principal
          const messagesRef = collection(chatRef, "messages"); // subcolección correcta

          await addDoc(messagesRef, {
            text: "health_checker: ok",
            sender: HEALTH_EMAIL,
            created: Date.now(),
          });
          console.log("Health checker: ok ✅");
        } catch (err) {
          console.error("No se pudo enviar mensaje:", err);
        }
      };

      // Enviar primero y luego cada 5s
      await enviarOK();
      healthInterval = setInterval(enviarOK, 5000);

      // Captura de errores mientras el checker está activo
      window.addEventListener("error", async () => await enviarOK());
      window.addEventListener(
        "unhandledrejection",
        async () => await enviarOK()
      );
    } catch (err) {
      console.error("Error login health checker:", err);
    }
  }

  console.log("Para iniciar el health checker utiliza: health_checker()");
  window.health_checker = health_checker;
})();
