let currentStep = 0;
const steps = document.querySelectorAll(".step");

function showStep(index) {
  steps.forEach(step => step.classList.remove("active"));
  steps[index].classList.add("active");
}

function nextStep() {
  currentStep++;
  showStep(currentStep);
}

function prevStep() {
  currentStep--;
  showStep(currentStep);
}

function save() {
  const data = {
    nbPersonnes: nbPersonnes.value,
    logement: logement.value,
    superficie: superficie.value,
    fai: fai.value,
    prixBox: prixBox.value,
    operateur: operateur.value,
    prixMobile: prixMobile.value
  };

  let fiches = JSON.parse(localStorage.getItem("discover")) || [];
  fiches.push(data);
  localStorage.setItem("discover", JSON.stringify(fiches));

  alert("Fiche enregistrée !");
  window.location.href = "index.html";
}
