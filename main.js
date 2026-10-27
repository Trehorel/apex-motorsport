
import { startRace, setCamera, resetRace, stopRace } from "./game.js";

const $ = id => document.getElementById(id);

const disciplines = [
  { id: "f1", name: "Formule", icon: "🏎️", description: "Monoplaces, aérodynamique et vitesse.", maxSpeed: 350 },
  { id: "kart", name: "Karting", icon: "🏁", description: "Agilité, freinage et trajectoires.", maxSpeed: 120 },
  { id: "rally", name: "Rallye", icon: "🏔️", description: "Routes sinueuses et surfaces variées.", maxSpeed: 220 },
  { id: "drift", name: "Drift", icon: "💨", description: "Glisse contrôlée et angles de dérive.", maxSpeed: 240 },
  { id: "drag", name: "Dragster", icon: "🚀", description: "Accélération sur une ligne droite.", maxSpeed: 500 },
  { id: "time", name: "Contre-la-montre", icon: "⏱️", description: "Bats ton propre record.", maxSpeed: 300 },
  { id: "oval", name: "Ovale", icon: "🏟️", description: "Vitesse élevée sur un anneau.", maxSpeed: 330 },
  { id: "hill", name: "Course de côte", icon: "⛰️", description: "Montées, virages et descentes.", maxSpeed: 200 }
];

const colors = [
  "#ff5728", "#ffd447", "#9874ff", "#e9edf2", "#34b9a4",
  "#e83f55", "#4599ef", "#a6d65a", "#f28e2b", "#d9d9d9"
];

const carPrefixes = {
  f1: ["Apex Formula", "Vortex GP", "Falcon F1", "Orion Racing", "Nova GP", "Titan Formula", "Velocity GP", "Phoenix F1", "Vector GP", "Eclipse F1"],
  kart: ["Sprint Kart", "Mini Apex", "Razor Kart", "Flash Kart", "Junior GP", "Rocket Kart", "Pulse Kart", "Storm Kart", "Arrow Kart", "Comet Kart"],
  rally: ["Terra RS", "Gravel X", "Rally Pro", "Summit R", "Dirt Hunter", "Trail RS", "Roughline", "Mountain X", "Raptor Rally", "Stage Pro"],
  drift: ["Slide X", "Angle Pro", "Smoke RS", "Sideways GT", "Driftline", "Neon Slide", "Torque D", "Rearflow", "Apex Slide", "Burnout GT"],
  drag: ["Thunder V8", "Nitro X", "Quarter Mile", "Rocket Fuel", "Lightning DR", "Torque Beast", "Launch Pro", "Velocity DR", "Afterburner", "Nitro King"],
  time: ["Chrono GT", "Time Attack", "Aero RS", "Track Weapon", "Lap Hunter", "Vector TA", "Apex Sprint", "Pulse GT", "Rapid RS", "Precision R"],
  oval: ["Stock Apex", "Oval Racer", "Thunder Cup", "Speedway V8", "Draftline", "Superspeed", "Oval Storm", "Track King", "Pace Car X", "Stock Pro"],
  hill: ["Climb RS", "Mountain Pro", "Peak Hunter", "Hill Attack", "Summit GT", "Elevation X", "Uphill RS", "Ridge Runner", "Cliff Pro", "Alpine R"]
};

const trackNames = {
  f1: ["Circuit des Horizons", "Grand Prix d'Aurora", "Silver Coast GP", "Circuit du Phoenix", "Royal Motorsport Park", "Grand Prix des Dunes", "Circuit Orion", "Apex International", "Vitesse Park", "Circuit des Lacs"],
  kart: ["Kart Arena", "Mini Speedway", "Karting des Pins", "Junior Circuit", "Kart Park", "Sprint Arena"],
  rally: ["Forêt Noire", "Col des Aigles", "Gravel Valley", "Rallye des Lacs", "Dust Canyon", "Alpine Stage", "Route des Falaises"],
  drift: ["Tokyo Slide", "Industrial Zone", "Neon Dock", "Drift District", "Asphalt Yard", "Midnight Arena"],
  drag: ["Quarter Mile", "Nitro Strip", "Dragway 400", "Thunder Lane", "Launch Arena"],
  time: ["Chrono Park", "Precision Ring", "Time Attack GP", "Fast Lap Circuit", "Delta Raceway", "Sector One"],
  oval: ["Speedway National", "Oval Thunder", "Grand Oval", "Stock Arena", "Superspeed Ring", "Oval 500"],
  hill: ["Col du Sommet", "Montagne Rouge", "Alpine Climb", "Route du Belvédère", "Peak Challenge", "Ridge Pass"]
};

const disciplineById = id => disciplines.find(d => d.id === id) || disciplines[0];

const allTracks = [];
let trackNumber = 0;

for (const discipline of disciplines) {
  const names = trackNames[discipline.id];
  for (const name of names) {
    trackNumber++;
    allTracks.push({
      id: `track-${trackNumber}`,
      name,
      discipline: discipline.id,
      length: 2.5 + ((trackNumber * 7) % 90) / 10,
      turns: 6 + ((trackNumber * 3) % 16),
      seed: trackNumber * 13 + 7,
      elevation: discipline.id === "hill" || discipline.id === "rally",
      description: `${discipline.name} · ${6 + ((trackNumber * 3) % 16)} virages · ${discipline.id === "hill" || discipline.id === "rally" ? "relief" : "piste rapide"}`
    });
  }
}

// Complète automatiquement le catalogue à 50 circuits.
while (allTracks.length < 50) {
  const source = allTracks[allTracks.length % Math.max(1, allTracks.length)];
  const n = allTracks.length + 1;
  allTracks.push({
    ...source,
    id: `track-${n}`,
    name: `${source.name} ${String(n).padStart(2, "0")}`,
    seed: n * 29,
    length: 3 + (n % 8) * 0.7
  });
}

const allCars = [];
disciplines.forEach(discipline => {
  carPrefixes[discipline.id].forEach((name, i) => {
    allCars.push({
      id: `${discipline.id}-car-${i + 1}`,
      name,
      discipline: discipline.id,
      color: colors[i],
      power: Math.round(150 + i * 65 + (discipline.id === "f1" ? 180 : 0)),
      grip: Math.max(0.55, 0.96 - i * 0.035),
      maxSpeed: discipline.maxSpeed - i * 5,
      type: discipline.id
    });
  });
});

const CUSTOM_CARS_KEY = "apex-custom-cars-v1";
const CUSTOM_TRACKS_KEY = "apex-custom-tracks-v1";

function loadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Sauvegarde impossible :", error);
    alert("La sauvegarde a échoué. Vérifie l'espace disponible dans ton navigateur.");
    return false;
  }
}

let customCars = loadArray(CUSTOM_CARS_KEY);
let customTracks = loadArray(CUSTOM_TRACKS_KEY);
let selectedDiscipline = "f1";
let selectedTrackId = allTracks[0].id;
let selectedCarId = allCars[0].id;
let activeFilter = "all";
let editorPoints = [];
let editorClosed = false;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function getAllCars() {
  return [...allCars, ...customCars];
}

function getAllTracks() {
  return [...allTracks, ...customTracks];
}

function svgTrack(seed) {
  const points = [];
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const r = 27 + Math.sin(angle * 3 + seed) * 5 + Math.cos(angle * 2 + seed) * 3;
    points.push(`${50 + Math.cos(angle) * r},${50 + Math.sin(angle) * r * .7}`);
  }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><pattern id="g${seed}" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 8 0 L 0 0 0 8" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width=".4"/></pattern></defs>
    <rect width="100" height="100" fill="url(#g${seed})"/>
    <polyline points="${points.join(" ")} ${points[0]}" fill="none" stroke="#08090c" stroke-width="12" stroke-linejoin="round"/>
    <polyline points="${points.join(" ")} ${points[0]}" fill="none" stroke="#ff5728" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
}

function renderDisciplineCards() {
  const html = disciplines.map(d => `
    <article class="discipline-card">
      <div class="discipline-art"><span class="discipline-icon">${d.icon}</span></div>
      <div class="discipline-info">
        <h3>${d.name}</h3><p>${d.description}</p>
        <button class="text-button choose-discipline" data-discipline="${d.id}">CHOISIR ↗</button>
      </div>
    </article>`).join("");
  $("home-disciplines").innerHTML = html;
}

function renderFilters() {
  $("discipline-filters").innerHTML =
    `<button class="filter-chip ${activeFilter === "all" ? "active" : ""}" data-filter="all">TOUTES</button>` +
    disciplines.map(d => `<button class="filter-chip ${activeFilter === d.id ? "active" : ""}" data-filter="${d.id}">${d.name.toUpperCase()}</button>`).join("");
}

function renderTracks() {
  const tracks = getAllTracks().filter(t => activeFilter === "all" || t.discipline === activeFilter);
  $("track-list").innerHTML = tracks.map(track => `
    <article class="track-card">
      <div class="track-art">${svgTrack(track.seed || 3)}</div>
      <div class="track-info">
        <div class="track-meta"><span>${disciplineById(track.discipline).name.toUpperCase()}</span><span>${Number(track.length).toFixed(1)} KM</span></div>
        <h3>${escapeHTML(track.name)}</h3>
        <p>${escapeHTML(track.description || `${track.turns || 8} virages · Circuit personnalisé`)}</p>
        <button class="button button-ghost select-track" data-track="${escapeHTML(track.id)}">SÉLECTIONNER CE CIRCUIT</button>
      </div>
    </article>`).join("");
}

function fillSelect(select, items, valueFn, labelFn, selected) {
  select.innerHTML = items.map(item =>
    `<option value="${escapeHTML(valueFn(item))}" ${valueFn(item) === selected ? "selected" : ""}>${escapeHTML(labelFn(item))}</option>`
  ).join("");
}

function populateDisciplineSelects() {
  const opts = disciplines.map(d => ({ id: d.id, name: d.name }));
  [
    "race-discipline", "garage-discipline",
    "custom-car-discipline", "custom-track-discipline"
  ].forEach(id => fillSelect($(id), opts, d => d.id, d => d.name, selectedDiscipline));
}

function renderRaceSetup() {
  const d = $("race-discipline").value || selectedDiscipline;
  const tracks = getAllTracks().filter(t => t.discipline === d);
  const cars = getAllCars().filter(c => c.discipline === d);

  if (!tracks.length) return;

  if (!tracks.some(t => t.id === selectedTrackId)) selectedTrackId = tracks[0].id;
  if (!cars.some(c => c.id === selectedCarId)) selectedCarId = cars[0].id;

  fillSelect($("race-track"), tracks, t => t.id, t => `${t.name} — ${Number(t.length).toFixed(1)} km`, selectedTrackId);
  fillSelect($("race-car"), cars, c => c.id, c => `${c.name} — ${c.maxSpeed} km/h`, selectedCarId);
  selectedTrackId = $("race-track").value;
  selectedCarId = $("race-car").value;
}

function carCard(car) {
  return `<article class="car-card">
    <div class="car-art"><div class="car-silhouette" style="background:${escapeHTML(car.color)}"></div></div>
    <div class="car-info">
      <div class="track-meta"><span>${disciplineById(car.discipline).name.toUpperCase()}</span><span>${car.maxSpeed} KM/H</span></div>
      <h3>${escapeHTML(car.name)}</h3>
      <p class="specs"><span>${car.power} ch</span><span>Adhérence ${Math.round(car.grip * 100)}%</span></p>
      <button class="button button-ghost use-car" data-car="${escapeHTML(car.id)}">CHOISIR CETTE VOITURE</button>
    </div>
  </article>`;
}

function renderGarage() {
  const d = $("garage-discipline").value || "f1";
  const search = $("car-search").value.trim().toLowerCase();
  const cars = getAllCars().filter(c =>
    c.discipline === d && c.name.toLowerCase().includes(search)
  );
  $("garage-grid").innerHTML = cars.length
    ? cars.map(carCard).join("")
    : `<p>Aucune voiture trouvée pour cette recherche.</p>`;
}

function renderCustomCars() {
  $("custom-car-list").innerHTML = customCars.length
    ? customCars.map(carCard).join("")
    : `<p class="form-note">Tu n'as pas encore créé de voiture.</p>`;
}

function renderCustomTracks() {
  const root = $("custom-track-list");
  root.innerHTML = customTracks.length
    ? customTracks.map(track => `
      <article class="track-card">
        <div class="track-art">${svgTrack(track.seed || 3)}</div>
        <div class="track-info">
          <div class="track-meta"><span>${disciplineById(track.discipline).name}</span><span>${track.length} KM</span></div>
          <h3>${escapeHTML(track.name)}</h3>
          <p>${(track.points || []).length} points · ${track.uphill || 0} montées · ${track.downhill || 0} descentes</p>
          <button class="button button-primary test-track" data-track="${escapeHTML(track.id)}">TESTER CE CIRCUIT</button>
          <button class="text-button delete-track" data-track="${escapeHTML(track.id)}">SUPPRIMER</button>
        </div>
      </article>`).join("")
    : `<p class="form-note">Ton espace est vide. Dessine un tracé dans l'éditeur pour commencer.</p>`;
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  const page = $(`page-${name}`);
  if (page) page.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  if (name === "courses") {
    renderFilters();
    renderTracks();
    renderRaceSetup();
  }
  if (name === "garage") renderGarage();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    event.preventDefault();
    showPage(pageButton.dataset.page);
    return;
  }

  const disciplineButton = event.target.closest("[data-discipline]");
  if (disciplineButton && disciplineButton.classList.contains("choose-discipline")) {
    selectedDiscipline = disciplineButton.dataset.discipline;
    activeFilter = selectedDiscipline;
    showPage("courses");
    $("race-discipline").value = selectedDiscipline;
    renderRaceSetup();
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    activeFilter = filter.dataset.filter;
    renderFilters();
    renderTracks();
    return;
  }

  const trackButton = event.target.closest(".select-track");
  if (trackButton) {
    const track = getAllTracks().find(t => t.id === trackButton.dataset.track);
    if (track) {
      selectedDiscipline = track.discipline;
      selectedTrackId = track.id;
      $("race-discipline").value = track.discipline;
      renderRaceSetup();
      $("race-track").value = track.id;
      $("race-setup")?.scrollIntoView({ behavior: "smooth" });
      document.querySelector(".race-setup").scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const carButton = event.target.closest(".use-car");
  if (carButton) {
    const car = getAllCars().find(c => c.id === carButton.dataset.car);
    if (car) {
      selectedDiscipline = car.discipline;
      selectedCarId = car.id;
      showPage("courses");
      $("race-discipline").value = car.discipline;
      renderRaceSetup();
      $("race-car").value = car.id;
      document.querySelector(".race-setup").scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const testButton = event.target.closest(".test-track");
  if (testButton) {
    const track = customTracks.find(t => t.id === testButton.dataset.track);
    if (track) launchTrack(track);
    return;
  }

  const deleteButton = event.target.closest(".delete-track");
  if (deleteButton) {
    customTracks = customTracks.filter(t => t.id !== deleteButton.dataset.track);
    saveArray(CUSTOM_TRACKS_KEY, customTracks);
    renderCustomTracks();
    return;
  }

  const cameraButton = event.target.closest("[data-camera]");
  if (cameraButton) {
    setCamera(cameraButton.dataset.camera);
    document.querySelectorAll("[data-camera]").forEach(b =>
      b.classList.toggle("active", b === cameraButton)
    );
  }
});

$("race-discipline").addEventListener("change", event => {
  selectedDiscipline = event.target.value;
  renderRaceSetup();
});

$("race-track").addEventListener("change", event => selectedTrackId = event.target.value);
$("race-car").addEventListener("change", event => selectedCarId = event.target.value);
$("garage-discipline").addEventListener("change", renderGarage);
$("car-search").addEventListener("input", renderGarage);

function launchTrack(track) {
  const car = getAllCars().find(c => c.discipline === track.discipline) || allCars[0];
  selectedDiscipline = track.discipline;
  selectedTrackId = track.id;
  selectedCarId = car.id;
  showPage("courses");
  $("race-discipline").value = track.discipline;
  renderRaceSetup();
  $("race-track").value = track.id;
  $("race-car").value = car.id;
  startSelectedRace(track, car);
}

function startSelectedRace(trackOverride, carOverride) {
  const track = trackOverride || getAllTracks().find(t => t.id === $("race-track").value);
  const car = carOverride || getAllCars().find(c => c.id === $("race-car").value);
  if (!track || !car) {
    alert("Choisis un circuit et une voiture avant le départ.");
    return;
  }

  $("game-title").textContent = `${track.name} · ${disciplineById(track.discipline).name}`;
  $("game-panel").classList.add("visible");
  $("game-loading").style.display = "none";
  startRace(track, car, $("race-mode").value);
  $("game-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("start-race").addEventListener("click", () => startSelectedRace());
$("reset-race").addEventListener("click", resetRace);
$("exit-race").addEventListener("click", () => {
  stopRace();
  $("game-panel").classList.remove("visible");
  $("game-loading").style.display = "flex";
});

$("custom-car-power").addEventListener("input", event => {
  $("power-output").value = `${event.target.value} ch`;
});
$("custom-car-grip").addEventListener("input", event => {
  $("grip-output").value = `${event.target.value} %`;
});
$("custom-car-color").addEventListener("input", event => {
  $("car-preview-model").style.background = event.target.value;
});
$("custom-car-name").addEventListener("input", event => {
  $("car-preview-model").textContent = event.target.value.slice(0, 16) || "APEX";
});

$("car-form").addEventListener("submit", event => {
  event.preventDefault();
  const discipline = $("custom-car-discipline").value;
  const d = disciplineById(discipline);
  const car = {
    id: `custom-car-${Date.now()}`,
    name: $("custom-car-name").value.trim(),
    discipline,
    color: $("custom-car-color").value,
    power: Number($("custom-car-power").value),
    grip: Number($("custom-car-grip").value) / 100,
    maxSpeed: Math.min(d.maxSpeed, Math.round(Number($("custom-car-power").value) * .38)),
    type: discipline,
    custom: true
  };

  if (!car.name) return;
  customCars.push(car);
  if (saveArray(CUSTOM_CARS_KEY, customCars)) {
    renderCustomCars();
    renderGarage();
    renderRaceSetup();
    alert("Voiture sauvegardée dans ton garage.");
  }
});

$("custom-track-width").addEventListener("input", event => {
  $("width-output").value = `${event.target.value} m`;
});

const canvas = $("track-canvas");
const ctx = canvas.getContext("2d");

function drawEditor() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#13151a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#2b2d34";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  if (editorPoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(editorPoints[0].x, editorPoints[0].y);
    editorPoints.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    if (editorClosed) ctx.closePath();

    ctx.strokeStyle = "#07080a";
    ctx.lineWidth = Number($("custom-track-width").value) * 2.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.strokeStyle = "#ff5728";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#ffd447";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = "#777982";
    ctx.font = "20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CLIQUE POUR PLACER TON PREMIER POINT", width / 2, height / 2);
  }

  editorPoints.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === 0 ? 9 : 6, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? "#ffd447" : "#f7f7f4";
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

canvas.addEventListener("click", event => {
  if (editorClosed) return;
  const rect = canvas.getBoundingClientRect();
  editorPoints.push({
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  });
  drawEditor();
});

$("clear-track").addEventListener("click", () => {
  editorPoints = [];
  editorClosed = false;
  drawEditor();
});

$("undo-point").addEventListener("click", () => {
  editorPoints.pop();
  editorClosed = false;
  drawEditor();
});

$("close-track").addEventListener("click", () => {
  if (editorPoints.length < 4) {
    alert("Place au moins 4 points pour fermer un circuit.");
    return;
  }
  editorClosed = true;
  drawEditor();
});

$("track-form").addEventListener("submit", event => {
  event.preventDefault();

  if (editorPoints.length < 4 || !editorClosed) {
    alert("Dessine un tracé d'au moins 4 points et ferme-le avant de sauvegarder.");
    return;
  }

  const track = {
    id: `custom-track-${Date.now()}`,
    name: $("custom-track-name").value.trim(),
    discipline: $("custom-track-discipline").value,
    length: Number($("custom-track-length").value),
    width: Number($("custom-track-width").value),
    uphill: Number($("custom-track-uphill").value),
    downhill: Number($("custom-track-downhill").value),
    jumps: Number($("custom-track-jumps").value),
    bumps: Number($("custom-track-bumps").value),
    points: editorPoints.map(p => ({
      x: (p.x / canvas.width - .5) * 2,
      z: (p.y / canvas.height - .5) * 2
    })),
    seed: Date.now() % 100000,
    turns: editorPoints.length,
    description: "Circuit créé par le joueur"
  };

  if (!track.name) {
    alert("Donne un nom à ton circuit.");
    return;
  }

  customTracks.push(track);
  if (saveArray(CUSTOM_TRACKS_KEY, customTracks)) {
    renderCustomTracks();
    renderTracks();
    renderRaceSetup();
    alert("Circuit sauvegardé. Tu peux le retrouver dans « Mes circuits ».");
  }
});

$("test-custom-track").addEventListener("click", () => {
  if (editorPoints.length < 4 || !editorClosed) {
    alert("Dessine et ferme d'abord ton circuit.");
    return;
  }

  const temporaryTrack = {
    id: "temporary-track",
    name: $("custom-track-name").value.trim() || "Circuit test",
    discipline: $("custom-track-discipline").value,
    length: Number($("custom-track-length").value) || 3.5,
    width: Number($("custom-track-width").value) || 12,
    points: editorPoints.map(p => ({
      x: (p.x / canvas.width - .5) * 2,
      z: (p.y / canvas.height - .5) * 2
    })),
    turns: editorPoints.length,
    seed: 42,
    elevation: Number($("custom-track-uphill").value) > 0
  };
  launchTrack(temporaryTrack);
});

function init() {
  renderDisciplineCards();
  populateDisciplineSelects();
  $("race-discipline").value = "f1";
  $("garage-discipline").value = "f1";
  $("custom-car-discipline").value = "f1";
  $("custom-track-discipline").value = "f1";
  renderFilters();
  renderTracks();
  renderRaceSetup();
  renderGarage();
  renderCustomCars();
  renderCustomTracks();
  drawEditor();
}

init();
