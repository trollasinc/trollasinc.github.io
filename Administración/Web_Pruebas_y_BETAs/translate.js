const supported = ["es", "en", "fr", "it"];
if (!location.hash) location.hash = (navigator.language || "es").slice(0, 2);

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: "es", autoDisplay: true },
    "google_translate_element"
  );
  applyHashLang(location.hash.slice(1));
  window.addEventListener("hashchange", () =>
    applyHashLang(location.hash.slice(1))
  );
}

function applyHashLang(hashLang) {
  let attempts = 0;
  const maxAttempts = 20;
  const checkSelect = setInterval(() => {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      if (
        hashLang &&
        select.value !== hashLang &&
        supported.includes(hashLang)
      ) {
        select.value = hashLang;
        select.dispatchEvent(new Event("change"));
      }
      clearInterval(checkSelect);
    } else if (++attempts >= maxAttempts) {
      clearInterval(checkSelect);
    }
  }, 500);
}
