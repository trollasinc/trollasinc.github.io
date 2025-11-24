// == Editor Web Deluxe 25 Estilos ==
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "miWebEditor";
  const ORIGINAL_HTML_KEY = "miWebEditorOriginal";

  // Banner fijo
  const banner = document.createElement("div");
  banner.innerText =
    "⚠️ Atención: Estás en modo desarrollador. Doble click = editar, Ctrl+click = restaurar.";
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    fontSize: "14px",
    padding: "8px",
    zIndex: "10000",
    textAlign: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  });
  document.body.appendChild(banner);
  document.body.style.paddingTop =
    banner.offsetHeight +
    parseInt(window.getComputedStyle(document.body).paddingTop) +
    "px";

  if (!localStorage.getItem(ORIGINAL_HTML_KEY))
    localStorage.setItem(ORIGINAL_HTML_KEY, document.body.innerHTML);
  let savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const originalHTML = localStorage.getItem(ORIGINAL_HTML_KEY);
  for (const path in savedData) {
    const el = document.querySelector(path);
    if (el) el.outerHTML = savedData[path];
  }

  function getPath(el) {
    if (el.id) return "#" + el.id;
    let path = el.tagName.toLowerCase();
    if (el.className) path += "." + el.className.trim().replace(/\s+/g, ".");
    if (el.parentElement) path = getPath(el.parentElement) + " > " + path;
    return path;
  }

  function rgb2hex(rgb) {
    const result = rgb.match(/\d+/g);
    if (!result) return "#000000";
    return (
      "#" +
      result
        .slice(0, 3)
        .map((x) => parseInt(x).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  // Panel editor
  function createPanel(el) {
    if (document.getElementById("editorPanel"))
      document.getElementById("editorPanel").remove();
    if (document.getElementById("editorMinimizedBtn"))
      document.getElementById("editorMinimizedBtn").remove();

    const panel = document.createElement("div");
    panel.id = "editorPanel";
    Object.assign(panel.style, {
      position: "fixed",
      top: "100px",
      right: "50px",
      width: "450px",
      height: "550px",
      background: "#f0f0f0",
      border: "2px solid #333",
      zIndex: 10001,
      padding: "0",
      overflow: "hidden",
      fontFamily: "sans-serif",
      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
      borderRadius: "8px",
      resize: "both",
    });

    // Header draggable
    const header = document.createElement("div");
    header.style.background = "#333";
    header.style.color = "#fff";
    header.style.padding = "6px";
    header.style.cursor = "move";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.innerHTML = "<span>Editor: " + el.tagName + "</span>";
    const btns = document.createElement("div");
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "❌";
    const minBtn = document.createElement("button");
    minBtn.innerText = "🖉";
    [closeBtn, minBtn].forEach((b) => {
      Object.assign(b.style, {
        marginLeft: "4px",
        cursor: "pointer",
        background: "#fff",
        border: "none",
        borderRadius: "4px",
        width: "24px",
        height: "24px",
      });
    });
    btns.appendChild(minBtn);
    btns.appendChild(closeBtn);
    header.appendChild(btns);
    panel.appendChild(header);

    closeBtn.onclick = () => panel.remove();
    minBtn.onclick = () => {
      panel.style.display = "none";
      const miniBtn = document.createElement("button");
      miniBtn.id = "editorMinimizedBtn";
      miniBtn.innerText = "🖉";
      Object.assign(miniBtn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 10002,
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "#333",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "20px",
      });
      document.body.appendChild(miniBtn);
      miniBtn.onclick = () => {
        panel.style.display = "block";
        miniBtn.remove();
      };
    };

    // Draggable
    header.onmousedown = function (e) {
      let shiftX = e.clientX - panel.getBoundingClientRect().left;
      let shiftY = e.clientY - panel.getBoundingClientRect().top;
      function moveAt(pageX, pageY) {
        panel.style.left = pageX - shiftX + "px";
        panel.style.top = pageY - shiftY + "px";
      }
      function onMouseMove(e) {
        moveAt(e.pageX, e.pageY);
      }
      document.addEventListener("mousemove", onMouseMove);
      document.onmouseup = function () {
        document.removeEventListener("mousemove", onMouseMove);
        document.onmouseup = null;
      };
    };
    header.ondragstart = function () {
      return false;
    };

    // Tabs
    const tabs = document.createElement("div");
    tabs.style.display = "flex";
    tabs.style.justifyContent = "space-between";
    tabs.style.background = "#ddd";
    tabs.style.padding = "4px";
    const btnHTML = document.createElement("button");
    btnHTML.innerText = "HTML";
    const btnText = document.createElement("button");
    btnText.innerText = "Texto";
    const btnStyles = document.createElement("button");
    btnStyles.innerText = "Estilos";
    [btnHTML, btnText, btnStyles].forEach((b) => {
      b.style.flex = "1";
      b.style.margin = "2px";
      b.style.cursor = "pointer";
    });
    tabs.appendChild(btnHTML);
    tabs.appendChild(btnText);
    tabs.appendChild(btnStyles);
    panel.appendChild(tabs);

    // Preview
    const preview = document.createElement("div");
    preview.style.width = "100%";
    preview.style.height = "120px";
    preview.style.border = "1px solid #aaa";
    preview.style.padding = "5px";
    preview.style.margin = "10px 0";
    preview.style.overflow = "auto";
    preview.style.resize = "both";
    panel.appendChild(preview);

    const content = document.createElement("div");
    content.style.margin = "10px";
    content.style.overflow = "auto";
    panel.appendChild(content);

    function updatePreview() {
      preview.innerHTML = el.innerHTML;
      preview.style.cssText = el.style.cssText;
    }

    // Activar HTML
    function activateHTML() {
      content.innerHTML = "";
      preview.style.display = "block";
      const ta = document.createElement("textarea");
      ta.style.width = "100%";
      ta.style.height = "300px";
      ta.value = el.outerHTML;
      content.appendChild(ta);
      ta.addEventListener("input", () => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ta.value, "text/html");
        if (doc.body.firstChild) {
          el.replaceWith(doc.body.firstChild);
          updatePreview();
          savedData[getPath(doc.body.firstChild)] =
            doc.body.firstChild.outerHTML;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
        }
      });
      updatePreview();
    }

    // Activar Texto
    function activateText() {
      content.innerHTML = "";
      preview.style.display = "block";
      const ta = document.createElement("textarea");
      ta.style.width = "100%";
      ta.style.height = "150px";
      ta.value = el.innerText;
      content.appendChild(ta);
      ta.addEventListener("input", () => {
        el.innerText = ta.value;
        updatePreview();
        savedData[getPath(el)] = el.outerHTML;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
      });
      updatePreview();
    }

    // Activar Estilos (25 más usados)
    function activateStyles() {
      content.innerHTML = "";
      preview.style.display = "block";
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
        "padding-top",
        "padding-bottom",
        "padding-left",
        "padding-right",
        "margin",
        "margin-top",
        "margin-bottom",
        "margin-left",
        "margin-right",
        "border",
        "border-radius",
        "width",
        "height",
      ];

      cssProps.forEach((prop) => {
        let control;
        const val = getComputedStyle(el)[prop];
        if (prop.includes("color")) {
          control = document.createElement("input");
          control.type = "color";
          control.value = rgb2hex(val);
          control.addEventListener("input", () => {
            el.style[prop] = control.value;
            updatePreview();
            savedData[getPath(el)] = el.outerHTML;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          });
        } else if (prop.includes("font-family")) {
          control = document.createElement("select");
          [
            "Arial",
            "Verdana",
            "Times New Roman",
            "Courier New",
            "Georgia",
            "Tahoma",
          ].forEach((f) => {
            const o = document.createElement("option");
            o.value = f;
            o.innerText = f;
            control.appendChild(o);
          });
          control.value = val.split(",")[0];
          control.addEventListener("change", () => {
            el.style[prop] = control.value;
            updatePreview();
            savedData[getPath(el)] = el.outerHTML;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          });
        } else if (
          prop.includes("width") ||
          prop.includes("height") ||
          prop.includes("padding") ||
          prop.includes("margin") ||
          prop.includes("border-radius") ||
          prop.includes("line-height") ||
          prop.includes("letter-spacing") ||
          prop.includes("word-spacing") ||
          prop.includes("font-size")
        ) {
          control = document.createElement("input");
          control.type = "range";
          control.min = 0;
          control.max = 500;
          control.value = parseInt(val) || 0;
          control.addEventListener("input", () => {
            el.style[prop] =
              control.value + (prop.includes("line-height") ? "" : "px");
            updatePreview();
            savedData[getPath(el)] = el.outerHTML;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          });
        } else {
          control = document.createElement("input");
          control.type = "text";
          control.value = val;
          control.addEventListener("input", () => {
            el.style[prop] = control.value;
            updatePreview();
            savedData[getPath(el)] = el.outerHTML;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
          });
        }
        const lbl = document.createElement("label");
        lbl.innerText = prop + " ";
        lbl.appendChild(control);
        styleControls.appendChild(lbl);
        styleControls.appendChild(document.createElement("br"));
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

  // Habilita edición
  function enableEditing(el) {
    if (el.__editorEnabled) return;
    if (
      el.closest("#editorPanel") ||
      el === document.querySelector('div[style*="yellow"]')
    )
      return;
    el.__editorEnabled = true;
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      createPanel(el);
    });
    el.addEventListener("click", (e) => {
      if (e.ctrlKey) {
        e.stopPropagation();
        const parser = new DOMParser();
        const doc = parser.parseFromString(
          localStorage.getItem(ORIGINAL_HTML_KEY),
          "text/html"
        );
        const path = getPath(el);
        const originalEl = doc.querySelector(path);
        if (originalEl) {
          el.outerHTML = originalEl.outerHTML;
          savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          delete savedData[path];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData));
        }
      }
    });
  }

  // Agrega edición a todos los elementos visibles
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
});
