const lang = (navigator.language || "es").slice(0, 2);
const supported = ["es", "en", "fr", "it"];
const finalLang = supported.includes(lang) ? lang : "en";

if (!location.hash) location.hash = finalLang;

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    {
      pageLanguage: "es",
      autoDisplay: true,
    },
    "google_translate_element"
  );
}
