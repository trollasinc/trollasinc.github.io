let clicks = parseInt(localStorage.getItem("clicks")) || 0;
let clickScore = parseInt(localStorage.getItem("clickScore")) || 1;
let upgradeClickCost = parseInt(localStorage.getItem("upgradeClickCost")) || 10;
let pet1Cost = parseInt(localStorage.getItem("pet1Cost")) || 100;
let pet1Bought = localStorage.getItem("pet1Bought") === "true";
let pet1Level = parseInt(localStorage.getItem("pet1Level")) || 0;

const message = document.getElementById("message");
const button = document.getElementById("clickZone");
const counter = document.getElementById("clicksText");
const mejorarClick = document.getElementById("upgradeClick");
const buyPet1 = document.getElementById("buyPet1");
const buyPet1Text = document.getElementById("buyPet1Text");

counter.innerText = `Clicks: ${clicks}`;
mejorarClick.innerText = `Comprar (${upgradeClickCost} clicks)`;
updatePet1Text();
message.innerHTML = "<br>";
message.style.transition = "opacity 1s";

if (pet1Bought) mostrarPet1();

button.addEventListener("click", () => {
  clicks += clickScore;
  updateClicks();
});

function showMessage(text) {
  message.innerHTML = text;
  message.style.opacity = "1";
  setTimeout(() => {
    message.style.opacity = "0";
    setTimeout(() => {
      message.innerHTML = "<br>";
    }, 1000);
  }, 2000);
}

mejorarClick.addEventListener("click", () => {
  if (clicks >= upgradeClickCost) {
    clicks -= upgradeClickCost;
    clickScore += 1;
    showMessage(`Has mejorado el nivel de click. Nivel: ${clickScore}`);
    upgradeClickCost = Math.floor(upgradeClickCost * 2);
    mejorarClick.innerText = `Comprar (${upgradeClickCost} clicks)`;
    updateClicks();
    localStorage.setItem("upgradeClickCost", upgradeClickCost);
  } else {
    showMessage(
      `Necesitas al menos ${upgradeClickCost} clicks para mejorar el nivel de click.`
    );
  }
});

buyPet1.addEventListener("click", () => {
  if (clicks >= pet1Cost) {
    clicks -= pet1Cost;
    if (!pet1Bought) {
      pet1Bought = true;
      pet1Level = 1;
      showMessage("Has comprado Pet 1");
      mostrarPet1();
    } else {
      pet1Level += 1;
      showMessage("Has mejorado tu mascota. Nivel: " + pet1Level);
    }
    pet1Cost *= 2;
    updatePet1Text();
    updateClicks();
    localStorage.setItem("pet1Bought", "true");
    localStorage.setItem("pet1Level", pet1Level);
    localStorage.setItem("pet1Cost", pet1Cost);
  } else {
    showMessage(
      `Necesitas al menos ${pet1Cost} clicks para comprar o mejorar Pet 1`
    );
  }
});

function updatePet1Text() {
  if (!pet1Bought) {
    buyPet1Text.innerText = `Comprar mascota 1`;
    buyPet1.innerText = `Comprar (${pet1Cost} clicks)`;
  } else {
    buyPet1Text.innerText = `Mejorar mascota 1`;
    buyPet1.innerText = `Mejorar (${pet1Cost} clicks)`;
  }
}

function mostrarPet1() {
  if (!document.getElementById("pet1Img")) {
    const img = document.createElement("img");
    img.src = "mascota1.png";
    img.id = "pet1Img";
    img.style.position = "fixed";
    img.style.bottom = "10px";
    img.style.right = "10px";
    img.style.width = "100px";
    document.body.appendChild(img);
  }
}

function updateClicks() {
  counter.innerText = `Clicks: ${clicks}`;
  localStorage.setItem("clicks", clicks);
}

setInterval(() => {
  if (pet1Bought && pet1Level > 0) {
    clicks += pet1Level;
    updateClicks();
  }
}, 1000);

const renacerBtn = document.createElement("button");
renacerBtn.innerText = "Renacer";
renacerBtn.style.marginTop = "20px";
renacerBtn.style.padding = "10px 20px";
renacerBtn.style.cursor = "pointer";
document.body.appendChild(renacerBtn);

renacerBtn.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});
