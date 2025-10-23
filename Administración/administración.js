import { firebaseConfig } from "../api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Elementos ---
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const panel = document.getElementById("panel");
const loginMsg = document.getElementById("loginMsg");

// Clientes
const nombre = document.getElementById("nombre");
const apellidos = document.getElementById("apellidos");
const correo = document.getElementById("correo");
const telefono = document.getElementById("telefono");
const plan = document.getElementById("plan");
const info = document.getElementById("info");
const fotoUpload = document.getElementById("fotoUpload");
const addClientBtn = document.getElementById("addClientBtn");
const tbodyClientes = document.getElementById("tbodyClientes");
const contadorVisitantes = document.getElementById("contadorVisitantes");

// Visitas y correos
const tbodyVisitas = document.getElementById("tbodyVisitas");
const tbodyBans = document.getElementById("tbodyBans");
const tbodyCorreos = document.getElementById("tbodyCorreos");

// IP ban elements
const ipInput = document.getElementById("ipInput");
const reasonInput = document.getElementById("reasonInput");
const durationInput = document.getElementById("durationInput");
const banBtn = document.getElementById("banBtn");
const unbanIpInput = document.getElementById("unbanIpInput");
const unbanBtn = document.getElementById("unbanBtn");

let clientes = [];
let editando = false;
let clienteEditandoId = null;
let imagenCliente = null;

// --- Login ---
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("email").value,
      document.getElementById("password").value
    );
  } catch (err) {
    loginMsg.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginForm.style.display = "none";
    panel.classList.remove("hidden");
    await cargarClientes();
    await cargarVisitantes();
    await cargarVisitasDetalle();
    await cargarCorreos();
    await cargarBans(); // cargamos bans en la UI
    await cargarDocumentos();
  } else {
    loginForm.style.display = "block";
    panel.classList.add("hidden");
  }
});

// --- Clientes ---
async function cargarClientes() {
  try {
    const snap = await getDocs(collection(db, "clientes"));
    clientes = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    mostrarClientes();
  } catch (err) {
    console.error(err);
    tbodyClientes.innerHTML =
      "<tr><td colspan='8' style='text-align:center;color:red'>Error cargando clientes</td></tr>";
  }
}

function mostrarClientes() {
  if (clientes.length === 0) {
    tbodyClientes.innerHTML =
      "<tr><td colspan='8' style='text-align:center'>No hay clientes</td></tr>";
    return;
  }
  tbodyClientes.innerHTML = "";
  clientes.forEach((c) => {
    tbodyClientes.innerHTML += `<tr>
      <td>${c.foto ? `<img src="${c.foto}" class="imgPreview">` : "-"}</td>
      <td>${c.nombre || ""}</td>
      <td>${c.apellidos || ""}</td>
      <td>${c.correo || ""}</td>
      <td>${c.telefono || ""}</td>
      <td>${c.plan || ""}</td>
      <td>${c.info || ""}</td>
      <td>
        <button onclick="editarCliente('${
          c.id
        }')" class="small-btn btn-secondary">Editar</button>
        <button onclick="eliminarCliente('${
          c.id
        }')" class="small-btn btn-danger">Eliminar</button>
      </td>
    </tr>`;
  });
}

window.editarCliente = function (id) {
  const c = clientes.find((cl) => cl.id === id);
  if (!c) return;
  nombre.value = c.nombre;
  apellidos.value = c.apellidos;
  correo.value = c.correo;
  telefono.value = c.telefono;
  plan.value = c.plan;
  info.value = c.info;
  imagenCliente = c.foto;
  editando = true;
  clienteEditandoId = id;
  addClientBtn.textContent = "Actualizar Cliente";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.eliminarCliente = async function (id) {
  if (confirm("Eliminar este cliente?")) {
    await deleteDoc(doc(db, "clientes", id));
    cargarClientes();
  }
};

addClientBtn.addEventListener("click", async () => {
  if (!nombre.value || !apellidos.value || !correo.value)
    return alert("Nombre, Apellidos y Correo obligatorios");
  const cliente = {
    nombre: nombre.value,
    apellidos: apellidos.value,
    correo: correo.value,
    telefono: telefono.value,
    plan: plan.value,
    info: info.value,
    foto: imagenCliente || "",
  };
  if (editando) {
    const docRef = doc(db, "clientes", clienteEditandoId);
    await updateDoc(docRef, cliente);
    editando = false;
    clienteEditandoId = null;
    addClientBtn.textContent = "Guardar Cliente";
  } else {
    await addDoc(collection(db, "clientes"), cliente);
  }
  limpiarFormulario();
  cargarClientes();
});

function limpiarFormulario() {
  nombre.value = "";
  apellidos.value = "";
  correo.value = "";
  telefono.value = "";
  plan.value = "";
  info.value = "";
  fotoUpload.value = "";
  imagenCliente = null;
}

fotoUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => (imagenCliente = ev.target.result);
    reader.readAsDataURL(file);
  }
});

// --- Visitantes ---
async function cargarVisitantes() {
  try {
    const visitasSnap = await getDoc(doc(db, "estadisticas", "visitas"));
    const contador = visitasSnap.exists() ? visitasSnap.data().contador : 0;
    contadorVisitantes.textContent = "Total visitantes: " + contador;
  } catch (err) {
    contadorVisitantes.textContent = "Error cargando visitantes";
    console.error(err);
  }
}

// --- Detalle visitas ---
async function cargarVisitasDetalle(filtroIP = "") {
  tbodyVisitas.innerHTML =
    "<tr><td colspan='7' style='text-align:center'>Cargando...</td></tr>";

  try {
    const q = query(
      collection(db, "visitas_detalle"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tbodyVisitas.innerHTML =
        "<tr><td colspan='7' style='text-align:center'>No hay visitas registradas</td></tr>";
      return;
    }

    tbodyVisitas.innerHTML = "";
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const ip = d.ip || "—";

      if (filtroIP && !ip.includes(filtroIP)) return;

      const fecha = d.timestamp ? new Date(d.timestamp).toLocaleString() : "—";
      const navegador = d.navegador || "—";
      const so = d.so || "—";
      const idioma = d.idioma || "—";
      const ciudad = d.ciudad || "—";
      const pagina = d.page || "/";

      tbodyVisitas.innerHTML += `<tr>
        <td>${fecha}</td>
        <td>${navegador}</td>
        <td>${so}</td>
        <td>${idioma}</td>
        <td>${ip}</td>
        <td>${ciudad}</td>
        <td>${pagina}</td>
      </tr>`;
    });
  } catch (err) {
    console.error(err);
    tbodyVisitas.innerHTML =
      "<tr><td colspan='7' style='text-align:center'>Error cargando visitas</td></tr>";
  }
}
document.getElementById("btnBuscarIP").addEventListener("click", () => {
  const ip = document.getElementById("buscarIP").value.trim();
  cargarVisitasDetalle(ip);
});

document
  .getElementById("refreshVisitasBtn")
  .addEventListener("click", () => cargarVisitasDetalle());

// --- Correos ---
async function cargarCorreos(filtroCorreo = "") {
  const tableBody = document.getElementById("tbodyCorreos");
  tableBody.innerHTML =
    "<tr><td colspan='2' style='text-align:center'>Cargando...</td></tr>";

  try {
    const q = query(
      collection(db, "correos"),
      orderBy("fecha", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      tableBody.innerHTML =
        "<tr><td colspan='2' style='text-align:center'>No hay correos registrados</td></tr>";
      return;
    }

    tableBody.innerHTML = "";
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const correo = data.correo || "";

      if (filtroCorreo && !correo.includes(filtroCorreo)) return;

      const fecha = data.fecha?.toDate
        ? data.fecha.toDate().toLocaleString()
        : "—";

      tableBody.innerHTML += `<tr>
        <td>${correo}</td>
        <td>${fecha}</td>
      </tr>`;
    });
  } catch (err) {
    console.error(err);
    tableBody.innerHTML =
      "<tr><td colspan='2' style='text-align:center'>Error cargando correos</td></tr>";
  }
}

document.getElementById("btnBuscarCorreo").addEventListener("click", () => {
  const filtro = document.getElementById("buscarCorreo").value.trim();
  cargarCorreos(filtro);
});

document.getElementById("btnRefreshCorreos").addEventListener("click", () => {
  cargarCorreos();
});

// -------------------------------
// --- IP BAN / UNBAN FUNCTIONS ---
// -------------------------------

// Validación simple de IP (IPv4 e IPv6 básica)
function isValidIP(ip) {
  if (!ip) return false;
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

// Banear IP: ip (string), reason (string), durationHours (number, 0 = permanente)
async function banIp(ip, reason, durationHours = 0) {
  if (!isValidIP(ip)) throw new Error("IP no válida");
  if (!auth.currentUser) throw new Error("Usuario no autenticado");

  const docRef = doc(db, "ip_bans", ip);
  const nowISO = new Date().toISOString();
  const expiresAt =
    durationHours > 0
      ? new Date(Date.now() + durationHours * 3600e3).toISOString()
      : null;

  const data = {
    ip,
    reason: reason || "Sin motivo especificado",
    operator: auth.currentUser.email || auth.currentUser.uid || "unknown",
    permanent: durationHours === 0,
    createdAt: nowISO,
    expiresAt,
  };

  // Guardamos el ban con el ID = ip (fácil lookup)
  await setDoc(docRef, data);

  // registro opcional en logs (colección ip_ban_logs)
  await addDoc(collection(db, "ip_ban_logs"), {
    ip,
    action: "ban",
    operator: data.operator,
    reason: data.reason,
    createdAt: nowISO,
  });

  // actualizar UI
  await cargarBans();
}

// Desbanear IP
async function unbanIp(ip) {
  if (!isValidIP(ip)) throw new Error("IP no válida");
  if (!auth.currentUser) throw new Error("Usuario no autenticado");

  const docRef = doc(db, "ip_bans", ip);
  await deleteDoc(docRef);

  await addDoc(collection(db, "ip_ban_logs"), {
    ip,
    action: "unban",
    operator: auth.currentUser.email || auth.currentUser.uid || "unknown",
    createdAt: new Date().toISOString(),
  });

  await cargarBans();
}

// Cargar bans para mostrar en la tabla
async function cargarBans() {
  try {
    const snap = await getDocs(collection(db, "ip_bans"));
    if (snap.empty) {
      tbodyBans.innerHTML =
        "<tr><td colspan='5' style='text-align:center'>No hay bans</td></tr>";
      return;
    }
    tbodyBans.innerHTML = "";
    snap.forEach((s) => {
      const b = s.data();
      const exp = b.expiresAt
        ? new Date(b.expiresAt).toLocaleString()
        : b.permanent
        ? "Nunca"
        : "—";
      tbodyBans.innerHTML += `<tr>
              <td style="word-break:break-all">${b.ip}</td>
              <td>${b.permanent ? "Sí" : "No"}</td>
              <td>${exp}</td>
              <td>${b.operator || "—"}</td>
              <td>
                <button class="small-btn btn-danger" onclick="handleUnban('${
                  b.ip
                }')">Desbanear</button>
              </td>
            </tr>`;
    });
  } catch (err) {
    console.error(err);
    tbodyBans.innerHTML =
      "<tr><td colspan='5' style='text-align:center;color:red'>Error cargando bans</td></tr>";
  }
}

// Handlers de botones (UI)
banBtn.addEventListener("click", async () => {
  try {
    const ip = ipInput.value.trim();
    const reason = reasonInput.value.trim();
    const duration = parseInt(durationInput.value || "0", 10);
    if (!ip || !reason) return alert("IP y motivo son obligatorios");
    if (!isValidIP(ip)) return alert("IP no válida");
    // confirmar
    if (!confirm(`¿Banear ${ip}? (permanente: ${duration === 0})`)) return;
    await banIp(ip, reason, duration);
    alert("IP baneada ✅");
    ipInput.value = "";
    reasonInput.value = "";
    durationInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error al banear: " + (err.message || err));
  }
});

unbanBtn.addEventListener("click", async () => {
  try {
    const ip = unbanIpInput.value.trim();
    if (!ip) return alert("Introduce una IP");
    if (!isValidIP(ip)) return alert("IP no válida");
    if (!confirm(`¿Desbanear ${ip}?`)) return;
    await unbanIp(ip);
    alert("IP desbaneada ✅");
    unbanIpInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Error al desbanear: " + (err.message || err));
  }
});

// Exponer handler para botones generados en tabla (global)
window.handleUnban = async function (ip) {
  if (!confirm(`¿Desbanear ${ip}?`)) return;
  try {
    await unbanIp(ip);
    alert("IP desbaneada ✅");
  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || err));
  }
};

// -------------------------------
// --- FIN IP BAN / UNBAN ---
// -------------------------------

// Si quieres bloquear el acceso al panel basado en IP, lo ideal es hacerlo server-side.
// Aquí no he añadido bloqueo automático en onAuthStateChanged porque la IP real
// no se obtiene con fiabilidad desde el frontend. Si quieres, puedo añadir un ejemplo
// usando un Cloud Function para devolver la IP real y chequearla (dime si lo quieres).

// --- Documentos ---
const addDocBtn = document.getElementById("addDocBtn");
const documentForm = document.getElementById("documentForm");
const docNombre = document.getElementById("docNombre");
const docContenido = document.getElementById("docContenido");
const saveDocBtn = document.getElementById("saveDocBtn");
const cancelDocBtn = document.getElementById("cancelDocBtn");
const tbodyDocumentos = document.getElementById("tbodyDocumentos");
const docViewer = document.getElementById("docViewer");
const viewerNombre = document.getElementById("viewerNombre");
const viewerContenido = document.getElementById("viewerContenido");
const closeViewerBtn = document.getElementById("closeViewerBtn");

let editandoDoc = false;
let docEditandoId = null;
let documentos = [];

// Mostrar/ocultar formulario
addDocBtn.addEventListener("click", () => {
  documentForm.classList.remove("hidden");
  docNombre.value = "";
  docContenido.value = "";
  editandoDoc = false;
  docEditandoId = null;
});

cancelDocBtn.addEventListener("click", () => {
  documentForm.classList.add("hidden");
});

// Guardar documento en Firebase
saveDocBtn.addEventListener("click", async () => {
  const nombre = docNombre.value.trim();
  const contenido = docContenido.value.trim();
  if (!nombre || !contenido) return alert("Nombre y contenido obligatorios");

  const nowISO = new Date().toISOString();
  try {
    if (editandoDoc && docEditandoId) {
      // Actualizar
      const docRef = doc(db, "documentos", docEditandoId);
      await updateDoc(docRef, { nombre, contenido, updatedAt: nowISO });
    } else {
      // Nuevo
      await addDoc(collection(db, "documentos"), {
        nombre,
        contenido,
        updatedAt: nowISO,
      });
    }
    documentForm.classList.add("hidden");
    cargarDocumentos();
  } catch (err) {
    console.error(err);
    alert("Error guardando documento: " + (err.message || err));
  }
});

// Cargar documentos desde Firebase
async function cargarDocumentos() {
  tbodyDocumentos.innerHTML =
    "<tr><td colspan='2' style='text-align:center'>Cargando...</td></tr>";
  try {
    const snap = await getDocs(
      query(collection(db, "documentos"), orderBy("updatedAt", "desc"))
    );
    documentos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (documentos.length === 0) {
      tbodyDocumentos.innerHTML =
        "<tr><td colspan='2' style='text-align:center'>No hay documentos</td></tr>";
      return;
    }

    tbodyDocumentos.innerHTML = "";
    documentos.forEach((d) => {
      const fecha = d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "—";
      tbodyDocumentos.innerHTML += `<tr style="cursor:pointer;" onclick="abrirDocumento('${d.id}')">
        <td>${d.nombre}</td>
        <td>${fecha}</td>
      </tr>`;
    });
  } catch (err) {
    console.error(err);
    tbodyDocumentos.innerHTML =
      "<tr><td colspan='2' style='text-align:center;color:red'>Error cargando documentos</td></tr>";
  }
}

// Abrir documento en visor
window.abrirDocumento = function (id) {
  const docSel = documentos.find((d) => d.id === id);
  if (!docSel) return;
  viewerNombre.textContent = docSel.nombre;
  viewerContenido.textContent = docSel.contenido;
  docViewer.classList.remove("hidden");
};

closeViewerBtn.addEventListener("click", () => {
  docViewer.classList.add("hidden");
});

// Llamar al cargar el panel
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await cargarDocumentos();
  }
});
