// Detecta idioma del navegador y añade hash si no existe
const lang = (navigator.language || "es").slice(0, 2);
const supported = ["es", "en", "fr", "it"];
const finalLang = supported.includes(lang) ? lang : "en";

if (!location.hash) location.hash = finalLang;

// Inicializa Google Translate
function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: "es",
      autoDisplay: true,
    },
    "google_translate_element"
  );
}

// Forzar traducción según hash automáticamente
const interval = setInterval(() => {
  const select = document.querySelector(".goog-te-combo");
  if (select) {
    const hashLang = location.hash.slice(1);
    if (hashLang && select.value !== hashLang) {
      select.value = hashLang;
      select.dispatchEvent(new Event("change"));
    }
    clearInterval(interval);
  }
}, 500);
