document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("discoverForm");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = {
        nbPersonnes: nbPersonnes.value,
        logement: logement.value,
        superficie: superficie.value,
        teletravail: teletravail.value,
        devices: devices.value,
        tv: tv.value,
        aboTv: aboTv.value,
        alarme: alarme.value,
        fai: fai.value,
        prixBox: prixBox.value,
        engagementBox: engagementBox.value,
        tech: tech.value,
        operateur: operateur.value,
        prixMobile: prixMobile.value,
        engagementMobile: engagementMobile.value,
        data: data.value,
        lignes: lignes.value
      };

      let fiches = JSON.parse(localStorage.getItem("discover")) || [];
      fiches.push(data);

      localStorage.setItem("discover", JSON.stringify(fiches));

      alert("Fiche enregistrée !");
      window.location.href = "index.html";
    });
  }

});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/discover/service-worker.js")
    .then(() => console.log("PWA prête 🚀"))
    .catch(err => console.log(err));
}
