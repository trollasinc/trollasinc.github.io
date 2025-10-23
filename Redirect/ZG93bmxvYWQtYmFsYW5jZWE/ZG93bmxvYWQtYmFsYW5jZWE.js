const DESTINO = "../../Balancea/Download"; // Cambia esto a tu URL

document
  .getElementById("redirectForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const response = grecaptcha.getResponse();

    if (response.length === 0) {
      alert("Por favor, completa el CAPTCHA.");
      return;
    }

    // Redirigir tras un breve delay
    setTimeout(() => {
      window.location.href = DESTINO;
    }, 800);
  });
