import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCx8ITT_KZVSzZTWN20qV1yEZ5CwILkm2M",
  authDomain: "trollas-inc-administracion.firebaseapp.com",
  projectId: "trollas-inc-administracion",
  storageBucket: "trollas-inc-administracion.firebasestorage.app",
  messagingSenderId: "247309275509",
  appId: "1:247309275509:web:33d62925b18474b2ac833c",
  measurementId: "G-G2T4HD22YH",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Generar ID único por visitante ---
function obtenerVisitanteID() {
  let id = localStorage.getItem("visitanteID");
  if (!id) {
    id = crypto.randomUUID
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

  const visitasRef = doc(db, "estadisticas", "visitas");
  const visitasSnap = await getDoc(visitasRef);

  if (!visitasSnap.exists()) {
    await setDoc(visitasRef, { contador: 1 });
  } else {
    await updateDoc(visitasRef, { contador: increment(1) });
  }

  localStorage.setItem("yaVisito", "true");
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

// --- Mostrar mensaje de bloqueado en la misma página ---
function showBlockedPlainText() {
  const message =
    "Error 403. Tu IP ha sido bloqueada por uno de nuestros administradores";
  // Reemplazar todo el contenido actual por el mensaje
  document.open();
  document.write(
    "<pre style='font-family:monospace; font-size:16px; color:red; text-align:center; margin-top:20%;'>" +
      message +
      "</pre>"
  );
  document.close();
}

// --- Registrar visita y ban IP temporal ---
async function registrarVisita(ipData) {
  try {
    const ip = ipData.ip || "";
    const ahora = new Date();

    // --- Verificar IP baneada temporal ---
    const bansSnap = await getDocs(collection(db, "ip_bans"));
    const baneada = bansSnap.docs.some((docSnap) => {
      const data = docSnap.data();
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      return data.ip === ip && (!expiresAt || expiresAt > ahora);
    });

    if (baneada) {
      showBlockedPlainText();
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
    console.error("Error registrando visita:", err);
  }
}

// --- JSONP ipapi.co ---
window.manejarIP = function (data) {
  registrarVisita(data);
};

const script = document.createElement("script");
script.src = "https://ipapi.co/jsonp/?callback=manejarIP";
document.body.appendChild(script);
