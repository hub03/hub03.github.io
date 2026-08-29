const BUILDINGS = {
  house: {
    emoji: "🏠", name: "Maison", cost: 20, upkeep: 1, unlockLevel: 1,
    description: "+4 habitants. Bonheur de base : 70%.",
  },
  shop: {
    emoji: "🏪", name: "Commerce", cost: 50, upkeep: 2, unlockLevel: 1,
    description: "Rapporte 5€ par tranche de 2 maisons proches. +2 bonheur.",
  },
  park: {
    emoji: "🌳", name: "Parc", cost: 30, upkeep: 1, unlockLevel: 1,
    description: "+10 bonheur aux maisons proches.",
  },
  restaurant: {
    emoji: "🍔", name: "Restaurant", cost: 75, upkeep: 3, unlockLevel: 2,
    description: "8€ de base + 2€ par tranche de 4 maisons proches. +5 bonheur.",
  },
  factory: {
    emoji: "🏭", name: "Usine", cost: 100, upkeep: 5, unlockLevel: 2,
    description: "30€ de base. -15 bonheur aux maisons proches.",
  },
};

const GOALS = [
  { id: "first", text: "Construire 3 maisons", reward: 100, check: s => count("house") >= 3 },
  { id: "people10", text: "Atteindre 10 habitants", reward: 100, check: s => s.population >= 10 },
  { id: "shop", text: "Construire 1 commerce", reward: 150, check: s => count("shop") >= 1 },
  { id: "happy", text: "Atteindre 75% de bonheur", reward: 250, check: s => s.happiness >= 75 },
  { id: "rich", text: "Atteindre 100€ de revenus par tour", reward: 500, check: s => s.income >= 100 },
];

const state = {
  size: 10,
  money: 200,
  population: 0,
  happiness: 70,
  income: 0,
  level: 1,
  paused: false,
  turn: 0,
  expansionPrice: 500,
  cells: [],
  selected: null,
  completedGoals: [],
  houseGrowth: {},
};

const $ = id => document.getElementById(id);

function createEmptyGrid(size) {
  return Array(size * size).fill(null);
}

state.cells = createEmptyGrid(state.size);

function indexOf(x, y) { return y * state.size + x; }

function coords(index) {
  return { x: index % state.size, y: Math.floor(index / state.size) };
}

function distance(a, b) {
  const A = coords(a), B = coords(b);
  return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y));
}

function nearby(index, radius = 2) {
  return state.cells
    .map((building, i) => ({ building, i }))
    .filter(x => x.building && x.i !== index && distance(index, x.i) <= radius);
}

function count(type) {
  return state.cells.filter(x => x?.type === type).length;
}

function housesNear(index) {
  return nearby(index).filter(x => x.building.type === "house").length;
}

function isUnlocked(type) {
  return BUILDINGS[type].unlockLevel <= state.level;
}

function getHouseHappiness(index) {
  let value = 70;
  const around = nearby(index);

  value += around.filter(x => x.building.type === "park").length * 10;
  value += around.filter(x => x.building.type === "restaurant").length * 5;
  value += around.filter(x => x.building.type === "shop").length * 2;
  value -= around.filter(x => x.building.type === "factory").length * 15;

  // Besoins de la ville
  if (state.population > 8 && count("shop") === 0) value -= 5;
  if (state.population > 24 && count("restaurant") === 0) value -= 10;
  if (state.population > 50 && count("park") === 0) value -= 10;

  return Math.max(0, Math.min(100, value));
}

function calculateEconomy() {
  let revenue = 0;
  let upkeep = 0;

  state.cells.forEach((building, index) => {
    if (!building) return;
    upkeep += BUILDINGS[building.type].upkeep;

    if (building.type === "shop") {
      revenue += Math.floor(housesNear(index) / 2) * 5;
    }
    if (building.type === "restaurant") {
      revenue += 8 + Math.floor(housesNear(index) / 4) * 2;
    }
    if (building.type === "factory") {
      revenue += 30;
    }
  });

  const happinessMultiplier =
    state.happiness < 40 ? 0.8 :
    state.happiness < 60 ? 0.9 :
    state.happiness < 80 ? 1 :
    state.happiness < 90 ? 1.1 : 1.2;

  return {
    revenue: Math.floor(revenue * happinessMultiplier),
    upkeep,
    net: Math.floor(revenue * happinessMultiplier) - upkeep,
  };
}

function recalculate() {
  state.population = state.cells.reduce((sum, b) => {
    if (!b) return sum;
    if (b.type === "house") return sum + (b.residents || 2);
    if (b.type === "apartment") return sum + (b.residents || 20);
    return sum;
  }, 0);

  const houses = state.cells
    .map((b, i) => b?.type === "house" ? getHouseHappiness(i) : null)
    .filter(v => v !== null);

  state.happiness = houses.length
    ? Math.round(houses.reduce((a, b) => a + b, 0) / houses.length)
    : 70;

  if (state.population >= 20) state.level = Math.max(state.level, 2);
  if (state.population >= 75 && state.happiness >= 60) state.level = Math.max(state.level, 3);

  state.income = calculateEconomy().net;
}

function render() {
  recalculate();

  $("money").textContent = state.money;
  $("population").textContent = state.population;
  $("happiness").textContent = state.happiness;
  $("income").textContent = state.income;
  $("levelLabel").textContent =
    `⭐ ${state.level === 1 ? "Village" : state.level === 2 ? "Petite ville" : "Ville"} · Niveau ${state.level}`;

  $("expandPrice").textContent = `${state.expansionPrice}€`;

  const grid = $("grid");
  grid.style.gridTemplateColumns = `repeat(${state.size}, var(--cell))`;
  grid.innerHTML = "";

  state.cells.forEach((building, index) => {
    const button = document.createElement("button");
    button.className = `cell ${building ? "" : "empty"} ${state.selected === index ? "selected" : ""}`;
    button.textContent = building ? BUILDINGS[building.type].emoji : "";
    button.title = building ? BUILDINGS[building.type].name : "Case vide";
    button.onclick = () => selectCell(index);
    grid.appendChild(button);
  });

  renderUnlocks();
  renderGoals();
  renderSelected();
}

function renderUnlocks() {
  const list = $("unlockList");
  const items = [
    ["🏠", "Maison", 1],
    ["🏪", "Commerce", 1],
    ["🌳", "Parc", 1],
    ["🍔", "Restaurant", 2],
    ["🏭", "Usine", 2],
    ["🏢", "Immeuble", 3],
  ];
  list.innerHTML = items.map(([emoji, name, level]) =>
    `<div class="goal ${state.level >= level ? "done" : ""}">
      ${state.level >= level ? "✓" : "🔒"} ${emoji} ${name} — niveau ${level}
    </div>`
  ).join("");
}

function renderGoals() {
  $("goals").innerHTML = GOALS.map(goal => {
    const done = state.completedGoals.includes(goal.id);
    return `<div class="goal ${done ? "done" : ""}">
      ${done ? "✓" : "☐"} ${goal.text} ${done ? "" : `<small>+${goal.reward}€</small>`}
    </div>`;
  }).join("");
}

function renderSelected() {
  if (state.selected === null) {
    $("selectedPanel").innerHTML =
      "<h2>Bienvenue 👋</h2><p>Construis quelques maisons, puis ajoute des commerces et des parcs pour faire grandir ta ville.</p>";
    return;
  }

  const building = state.cells[state.selected];
  if (!building) {
    $("selectedPanel").innerHTML = `
      <h2>Case vide</h2>
      <p>Construis quelque chose ici.</p>
      <button onclick="openBuildModal(${state.selected})">🏗️ Construire</button>`;
    return;
  }

  const data = BUILDINGS[building.type];
  let extra = "";

  if (building.type === "house") {
    extra = `
      <p>👥 Habitants : <strong>${building.residents || 2}/4</strong></p>
      <p>😊 Bonheur : <strong>${getHouseHappiness(state.selected)}%</strong></p>
      <p>📍 Maisons dans le rayon : ${housesNear(state.selected)}</p>
    `;
  } else {
    extra = `<p>📍 Maisons proches : <strong>${housesNear(state.selected)}</strong></p>`;
  }

  $("selectedPanel").innerHTML = `
    <h2>${data.emoji} ${data.name}</h2>
    <p>${data.description}</p>
    ${extra}
    <p>💸 Entretien : ${data.upkeep}€/tour</p>
    <button onclick="demolish(${state.selected})" class="danger">🗑️ Détruire (+${Math.floor(data.cost * .25)}€)</button>
  `;
}

function selectCell(index) {
  state.selected = index;
  if (!state.cells[index]) openBuildModal(index);
  render();
}

function openBuildModal(index) {
  state.selected = index;
  $("modalTitle").textContent = "Construire";
  $("buildingChoices").innerHTML = Object.entries(BUILDINGS).map(([type, b]) => {
    const unlocked = isUnlocked(type);
    const affordable = state.money >= b.cost;
    const disabled = !unlocked || !affordable;
    return `
      <button class="building-choice ${disabled ? "locked" : ""}"
        ${disabled ? "disabled" : ""}
        onclick="build('${type}', ${index})">
        <span class="emoji">${b.emoji}</span>
        <strong>${b.name}</strong>
        <small>${b.cost}€ · ${!unlocked ? "🔒 niveau " + b.unlockLevel : affordable ? b.description : "💸 Pas assez d'argent"}</small>
      </button>`;
  }).join("");
  $("modal").classList.remove("hidden");
}

function closeModal() {
  $("modal").classList.add("hidden");
}

function build(type, index) {
  const b = BUILDINGS[type];
  if (!isUnlocked(type) || state.money < b.cost || state.cells[index]) return;

  state.money -= b.cost;
  state.cells[index] = {
    type,
    residents: type === "house" ? 2 : undefined,
  };

  if (type === "house") state.houseGrowth[index] = 0;

  addLog(`${b.emoji} ${b.name} construit pour ${b.cost}€.`);
  closeModal();
  checkGoals();
  render();
}

function demolish(index) {
  const building = state.cells[index];
  if (!building) return;
  const refund = Math.floor(BUILDINGS[building.type].cost * .25);
  state.money += refund;
  addLog(`🗑️ ${BUILDINGS[building.type].name} détruit : +${refund}€.`);
  state.cells[index] = null;
  delete state.houseGrowth[index];
  render();
}

function runTurn() {
  if (state.paused) return;

  state.turn++;

  // Croissance des maisons : +1 habitant tous les 2 tours, jusqu'à 4.
  Object.keys(state.houseGrowth).forEach(key => {
    const index = Number(key);
    const house = state.cells[index];
    if (!house || house.type !== "house") return;
    state.houseGrowth[key]++;
    if (state.houseGrowth[key] >= 2 && house.residents < 4) {
      house.residents++;
      state.houseGrowth[key] = 0;
    }
  });

  recalculate();
  const economy = calculateEconomy();
  state.money = Math.max(0, state.money + economy.net);

  // Petite pénalité de crise si bonheur très bas.
  if (state.happiness < 30 && state.turn % 5 === 0) {
    const houses = state.cells.filter(b => b?.type === "house");
    if (houses.length) {
      const unlucky = houses[Math.floor(Math.random() * houses.length)];
      if (unlucky.residents > 1) {
        unlucky.residents--;
        addLog("😡 Crise : un habitant quitte la ville.");
      }
    }
  }

  addLog(`⏱️ Tour ${state.turn} : ${economy.net >= 0 ? "+" : ""}${economy.net}€.`);
  checkGoals();
  save();
  render();
}

function expand() {
  if (state.money < state.expansionPrice) {
    addLog("💸 Pas assez d'argent pour agrandir la ville.");
    return;
  }

  const oldSize = state.size;
  const newSize = oldSize + 3;
  const oldCells = state.cells;
  const newCells = createEmptyGrid(newSize);

  for (let y = 0; y < oldSize; y++) {
    for (let x = 0; x < oldSize; x++) {
      newCells[(y + 1) * newSize + (x + 1)] = oldCells[y * oldSize + x];
    }
  }

  state.money -= state.expansionPrice;
  state.size = newSize;
  state.cells = newCells;
  state.expansionPrice *= 2;
  state.selected = null;

  addLog(`🗺️ Ville agrandie : ${newSize}×${newSize}.`);
  save();
  render();
}

function checkGoals() {
  GOALS.forEach(goal => {
    if (!state.completedGoals.includes(goal.id) && goal.check(state)) {
      state.completedGoals.push(goal.id);
      state.money += goal.reward;
      addLog(`🎉 Objectif atteint : ${goal.text} (+${goal.reward}€).`);
    }
  });
}

function addLog(text) {
  const log = $("log");
  const line = document.createElement("div");
  line.textContent = text;
  log.prepend(line);
  while (log.children.length > 7) log.lastChild.remove();
}

function save() {
  localStorage.setItem("miniVilleSave", JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem("miniVilleSave");
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    state.selected = null;
    addLog("💾 Partie restaurée.");
  } catch {
    localStorage.removeItem("miniVilleSave");
  }
}

$("pauseBtn").onclick = () => {
  state.paused = !state.paused;
  $("pauseBtn").textContent = state.paused ? "▶ Reprendre" : "⏸ Pause";
};

$("tickBtn").onclick = () => {
  const wasPaused = state.paused;
  state.paused = false;
  runTurn();
  state.paused = wasPaused;
};

$("expandBtn").onclick = expand;
$("closeModal").onclick = closeModal;

$("modal").addEventListener("click", e => {
  if (e.target === $("modal")) closeModal();
});

$("resetBtn").onclick = () => {
  if (!confirm("Recommencer la partie ? La sauvegarde actuelle sera supprimée.")) return;
  localStorage.removeItem("miniVilleSave");
  location.reload();
};

load();
recalculate();
render();

setInterval(runTurn, 10000);
