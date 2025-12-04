import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { firebaseConfig } from "./api.js";

// --- Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("✅ Persistencia activada"))
  .catch((err) => console.log("❌ Error persistencia:", err.message));

// --- Login / Logout helpers ---
window.login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Usuario ${email} logueado`);
    editorEnabled = true;
    startEditor();
  } catch (err) {
    console.log("❌ Error login:", err.message);
  }
};
window.logout = async () => {
  try {
    await signOut(auth);
    editorEnabled = false;
    console.log("✅ Sesión cerrada");
  } catch (err) {
    console.log("❌ Error logout:", err.message);
  }
};

// --- Auth state listener ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(`✅ Sesión activa: ${user.email}`);
    editorEnabled = true;
    startEditor();
  } else {
    console.log("⚠️ No hay sesión activa");
  }
});

// --- Variables editor ---
let editorEnabled = false;
const STORAGE_KEY = "miWebEditor";
const ORIGINAL_KEY = "miWebOriginal";
let savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
let originalData = JSON.parse(localStorage.getItem(ORIGINAL_KEY) || "{}");

// --- Helpers ---
function rgb2hex(rgb) {
  if (!rgb) return "transparent";
  const rgba = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
  if (!rgba) return "transparent";
  const r = parseInt(rgba[1]).toString(16).padStart(2, "0");
  const g = parseInt(rgba[2]).toString(16).padStart(2, "0");
  const b = parseInt(rgba[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function encodeBase64Unicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function getStableId(el) {
  if (el.dataset.editorId) return el.dataset.editorId;
  let path = [];
  let node = el;
  while (node && node.nodeType === 1) {
    let index = 0;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    path.unshift(node.tagName + ":" + index);
    node = node.parentElement;
  }
  const hash = encodeBase64Unicode(el.outerHTML).substr(0, 8);
  const id = path.join(">") + "_" + hash;
  el.dataset.editorId = id;
  return id;
}

// --- Panel editor ---
function createPanel(el) {
  const existing = document.getElementById("editorPanel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "editorPanel";
  Object.assign(panel.style, {
    position: "fixed",
    top: "80px",
    right: "50px",
    width: "520px",
    height: "700px",
    background: "#f1f3f6",
    border: "2px solid #444",
    zIndex: 10001,
    padding: "0",
    overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
  });

  // --- Header ---
  const header = document.createElement("div");
  Object.assign(header.style, {
    background: "#333",
    color: "#fff",
    padding: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopLeftRadius: "10px",
    borderTopRightRadius: "10px",
  });
  header.innerHTML = `<span>Editor: ${el.tagName}</span>`;

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "❌";
  Object.assign(closeBtn.style, {
    cursor: "pointer",
    background: "#ff5c5c",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    width: "28px",
    height: "28px",
    fontWeight: "bold",
    marginRight: "5px",
  });
  closeBtn.onclick = () => panel.remove();

  const restoreBtn = document.createElement("button");
  restoreBtn.innerText = "♻️";
  Object.assign(restoreBtn.style, {
    cursor: "pointer",
    background: "#4caf50",
    border: "none",
    borderRadius: "5px",
    color: "#fff",
    width: "28px",
    height: "28px",
    fontWeight: "bold",
    marginRight: "5px",
  });
  restoreBtn.title = "Restaurar elemento original";
  restoreBtn.onclick = () => {
    const id = getStableId(el);
    if (originalData[id]) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalData[id], "text/html");
      const newEl = doc.body.firstChild;
      newEl.dataset.editorId = id;
      el.replaceWith(newEl);
      enableEditing(newEl);
      if (savedData[id]) delete savedData[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
      alert("✅ Elemento restaurado");
      panel.remove();
    }
  };

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.appendChild(restoreBtn);
  headerButtons.appendChild(closeBtn);
  header.appendChild(headerButtons);
  panel.appendChild(header);

  // --- Tabs ---
  const tabs = document.createElement("div");
  Object.assign(tabs.style, {
    display: "flex",
    justifyContent: "space-between",
    background: "#e0e0e0",
    padding: "6px",
  });
  const btnHTML = document.createElement("button");
  btnHTML.innerText = "HTML";
  const btnText = document.createElement("button");
  btnText.innerText = "Texto";
  const btnStyles = document.createElement("button");
  btnStyles.innerText = "Estilos";
  [btnHTML, btnText, btnStyles].forEach((b) =>
    Object.assign(b.style, {
      flex: "1",
      margin: "0 3px",
      cursor: "pointer",
      padding: "6px",
      fontWeight: "bold",
      borderRadius: "5px",
      border: "none",
      background: "#d4d4d4",
    })
  );
  tabs.appendChild(btnHTML);
  tabs.appendChild(btnText);
  tabs.appendChild(btnStyles);
  panel.appendChild(tabs);

  const content = document.createElement("div");
  Object.assign(content.style, {
    flex: "1",
    margin: "10px",
    overflowY: "auto",
  });
  panel.appendChild(content);

  const preview = document.createElement("div");
  Object.assign(preview.style, {
    width: "100%",
    height: "180px",
    border: "1px solid #aaa",
    padding: "5px",
    margin: "10px 0",
    overflow: "auto",
    background: "#fff",
  });
  panel.appendChild(preview);

  function updatePreview() {
    preview.innerHTML = "";
    const clone = el.cloneNode(true);
    clone.style.pointerEvents = "none";
    preview.appendChild(clone);
  }

  // --- HTML Editor ---
  function activateHTML() {
    content.innerHTML = "";
    const ta = document.createElement("textarea");
    Object.assign(ta.style, {
      width: "100%",
      height: "300px",
      fontFamily: "monospace",
    });
    ta.value = el.outerHTML;
    content.appendChild(ta);
    ta.addEventListener("input", () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(ta.value, "text/html");
      if (doc.body.firstChild) {
        const newEl = doc.body.firstChild;
        const id = getStableId(el);
        if (!originalData[id]) originalData[id] = el.outerHTML;
        localStorage.setItem(ORIGINAL_KEY, JSON.stringify(originalData));
        newEl.dataset.editorId = id;
        el.replaceWith(newEl);
        enableEditing(newEl);
        savedData[id] = newEl.outerHTML;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
        updatePreview();
      }
    });
    updatePreview();
  }

  // --- Text Editor ---
  function activateText() {
    content.innerHTML = "";
    const ta = document.createElement("textarea");
    Object.assign(ta.style, { width: "100%", height: "150px" });
    ta.value = el.innerText;
    content.appendChild(ta);
    ta.addEventListener("input", () => {
      const id = getStableId(el);
      if (!originalData[id]) originalData[id] = el.outerHTML;
      localStorage.setItem(ORIGINAL_KEY, JSON.stringify(originalData));
      el.innerText = ta.value;
      savedData[id] = el.outerHTML;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
      updatePreview();
    });
    updatePreview();
  }

  // --- Styles Editor ---
  function activateStyles() {
    content.innerHTML = "";
    const styleControls = document.createElement("div");
    const cssProps = [
      "color",
      "background-color",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-decoration",
      "text-align",
      "line-height",
      "letter-spacing",
      "word-spacing",
      "text-transform",
      "padding",
      "margin",
      "border",
      "border-radius",
      "width",
      "height",
    ];
    cssProps.forEach((prop) => {
      const val = getComputedStyle(el)[prop];
      const lbl = document.createElement("label");
      lbl.style.display = "block";
      lbl.innerText = prop + " ";

      if (prop === "background-color") {
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = val === "transparent" ? "#ffffff" : rgb2hex(val);
        colorInput.style.marginRight = "5px";
        const transparentBox = document.createElement("input");
        transparentBox.type = "checkbox";
        transparentBox.checked = val === "transparent";
        transparentBox.style.marginLeft = "5px";

        colorInput.addEventListener("input", () => {
          if (!transparentBox.checked) {
            el.style[prop] = colorInput.value;
            savedData[getStableId(el)] = el.outerHTML;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
            updatePreview();
          }
        });
        transparentBox.addEventListener("change", () => {
          el.style[prop] = transparentBox.checked
            ? "transparent"
            : colorInput.value;
          savedData[getStableId(el)] = el.outerHTML;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          updatePreview();
        });

        lbl.appendChild(colorInput);
        lbl.appendChild(document.createTextNode(" Transparente "));
        lbl.appendChild(transparentBox);
      } else {
        const control = document.createElement("input");
        control.type = "range";
        control.min = 0;
        control.max = 500;
        control.value = parseInt(val) || 0;
        control.addEventListener("input", () => {
          el.style[prop] =
            control.value +
            (["width", "height", "padding", "margin", "border-radius"].some(
              (k) => prop.includes(k)
            )
              ? "px"
              : "");
          savedData[getStableId(el)] = el.outerHTML;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          updatePreview();
        });
        lbl.appendChild(control);
      }
      styleControls.appendChild(lbl);
    });
    content.appendChild(styleControls);
    updatePreview();
  }

  btnHTML.onclick = activateHTML;
  btnText.onclick = activateText;
  btnStyles.onclick = activateStyles;

  activateHTML();
  document.body.appendChild(panel);
}

// --- Enable editing ---
function enableEditing(el) {
  if (el.__editorEnabled || el.closest("#editorPanel")) return;
  const id = getStableId(el);
  el.dataset.editorId = id;
  el.__editorEnabled = true;

  el.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    createPanel(el);
  });

  el.draggable = true;
  el.addEventListener("dragstart", (e) => {
    if (!e.shiftKey) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id);
  });
  el.addEventListener("dragover", (e) => e.preventDefault());
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!e.shiftKey) return;
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId === id) return;
    const draggedEl = document.querySelector(`[data-editor-id="${draggedId}"]`);
    if (draggedEl) el.parentElement.insertBefore(draggedEl, el);
  });
}

// --- Start editor ---
function startEditor() {
  if (!editorEnabled) return;

  if (!originalData || Object.keys(originalData).length === 0) {
    originalData = {};
    document.querySelectorAll("body *").forEach((el) => {
      originalData[getStableId(el)] = el.outerHTML;
    });
    localStorage.setItem(ORIGINAL_KEY, JSON.stringify(originalData));
  }

  savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  for (const id in savedData) {
    const el = document.querySelector(`[data-editor-id="${id}"]`);
    if (el) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(savedData[id], "text/html");
      const newEl = doc.body.firstChild;
      newEl.dataset.editorId = id;
      el.replaceWith(newEl);
      enableEditing(newEl);
    }
  }

  const banner = document.createElement("div");
  banner.innerText =
    "⚠️ MODO DESARROLLADOR: Doble click = editar, Arrastra cards con Shift";
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    background: "#fffa91",
    color: "#000",
    fontWeight: "bold",
    fontSize: "14px",
    padding: "6px",
    zIndex: "10000",
    textAlign: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  });
  document.body.appendChild(banner);
  document.body.style.paddingTop = banner.offsetHeight + "px";

  function addEditors() {
    document.querySelectorAll("body *").forEach((el) => {
      const style = getComputedStyle(el);
      if (style.display !== "none" && style.visibility !== "hidden")
        enableEditing(el);
    });
  }
  addEditors();
  const observer = new MutationObserver(() => addEditors());
  observer.observe(document.body, { childList: true, subtree: true });
}
