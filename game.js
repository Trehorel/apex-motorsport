
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

let renderer, scene, camera, car, path;
let animationId = null;
let running = false;
let currentCamera = "chase";
let currentTrack = null;
let currentCar = null;
let currentMode = "time";
let speed = 0;
let steering = 0;
let lateral = 0;
let progress = 0;
let elapsed = 0;
let lap = 1;
let lastTime = 0;
let countdownEnd = 0;
let starting = false;
let countdownValue = -1;
let roadWidth = 14;
let scenery = [];
let carWheels = [];
let wheelRotation = 0;

const keys = Object.create(null);
const clock = new THREE.Clock();

const $ = id => document.getElementById(id);

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(3).padStart(6, "0")}`;
}

function material(color, roughness = .55, metalness = .15) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geometry, mat, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCar(vehicle) {
  const group = new THREE.Group();
  const paint = material(vehicle.color || "#ff5728", .27, .48);
  const carbon = material("#17181c", .65, .25);
  const rubber = material("#09090b", .92, .02);
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#172936", metalness: .3, roughness: .13,
    transparent: true, opacity: .88
  });
  const metal = material("#9b9da4", .3, .8);
  const light = new THREE.MeshBasicMaterial({ color: "#fff4ce" });

  const discipline = vehicle.discipline || vehicle.type || "f1";
  const isKart = discipline === "kart";
  const isF1 = discipline === "f1";
  const isDrag = discipline === "drag";
  const isRally = discipline === "rally";
  const isDrift = discipline === "drift";
  const isOval = discipline === "oval";
  const isHill = discipline === "hill";
  const isTime = discipline === "time";

  const width = isKart ? .85 : isF1 ? 1.9 : isDrag ? 1.65 : isOval ? 1.85 : 1.72;
  const length = isKart ? 1.65 : isF1 ? 4.8 : isDrag ? 5 : isRally ? 4.1 : 4.15;
  const scale = isKart ? .72 : 1;

  // Châssis : plusieurs volumes profilés, et non un bloc cubique unique.
  addMesh(group, new THREE.BoxGeometry(width * .72, .25 * scale, length * .78), paint, [0, .42 * scale, 0]);

  if (isF1) {
    // Nez effilé et aileron avant.
    const nose = addMesh(group, new THREE.ConeGeometry(.43, 2.0, 12), paint, [0, .45, -1.45]);
    nose.rotation.x = -Math.PI / 2;

    addMesh(group, new THREE.BoxGeometry(2.05, .085, .43), carbon, [0, .37, -2.05]);
    addMesh(group, new THREE.BoxGeometry(.13, .3, .16), carbon, [-.72, .51, -1.96]);
    addMesh(group, new THREE.BoxGeometry(.13, .3, .16), carbon, [.72, .51, -1.96]);

    // Cockpit bas, dosseret et arceau de sécurité.
    const cockpit = addMesh(group, new THREE.SphereGeometry(.55, 24, 16), glass, [0, .69, -.15]);
    cockpit.scale.set(.68, .54, 1.08);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(.36, .045, 8, 24, Math.PI),
      metal
    );
    halo.rotation.z = Math.PI;
    halo.position.set(0, 1.02, -.18);
    group.add(halo);

    // Pontons latéraux et aileron arrière.
    [-1, 1].forEach(side => {
      const pod = addMesh(group, new THREE.BoxGeometry(.48, .25, 1.35), paint, [side * .65, .46, .1]);
      pod.rotation.y = side * -.08;
    });

    addMesh(group, new THREE.BoxGeometry(1.75, .10, .4), carbon, [0, .66, 1.76]);
    addMesh(group, new THREE.BoxGeometry(.12, .35, .1), carbon, [-.57, .5, 1.7]);
    addMesh(group, new THREE.BoxGeometry(.12, .35, .1), carbon, [.57, .5, 1.7]);

    // Suspensions apparentes.
    [-1, 1].forEach(side => {
      [-1.55, 1.25].forEach(z => {
        addMesh(group, new THREE.CylinderGeometry(.025, .025, .85, 6), metal,
          [side * .72, .38, z], [0, 0, Math.PI / 2]);
      });
    });
  } else if (isKart) {
    // Kart ouvert avec siège et volant.
    const seat = addMesh(group, new THREE.SphereGeometry(.34, 16, 12), carbon, [0, .63, .25]);
    seat.scale.set(.8, .85, .8);
    addMesh(group, new THREE.CylinderGeometry(.045, .045, .7, 10), metal, [0, .62, -.3],
      [Math.PI / 2, 0, 0]);
    addMesh(group, new THREE.TorusGeometry(.17, .035, 8, 16), carbon, [0, .75, -.42],
      [Math.PI / 2, 0, 0]);
    addMesh(group, new THREE.BoxGeometry(width * 1.5, .1, .12), carbon, [0, .3, -length * .45]);
  } else {
    // Carrosserie avec capot bas, cabine vitrée et toit.
    const hood = addMesh(group, new THREE.SphereGeometry(1, 20, 12), paint, [0, .52, -.83]);
    hood.scale.set(width * .43, .2, length * .32);

    const cabin = addMesh(group, new THREE.BoxGeometry(width * .65, .55, length * .35), glass, [0, .78, -.05]);
    cabin.rotation.x = -.05;

    const roof = addMesh(group, new THREE.BoxGeometry(width * .48, .09, length * .22), paint, [0, 1.05, -.06]);

    // Pare-brise avant et lunette arrière.
    addMesh(group, new THREE.BoxGeometry(width * .54, .26, .05), glass, [0, .84, -.58], [-.3, 0, 0]);
    addMesh(group, new THREE.BoxGeometry(width * .54, .22, .05), glass, [0, .83, .52], [.3, 0, 0]);

    if (isRally || isHill) {
      // Protection de toit et éléments de carrosserie de rallye.
      [-1, 1].forEach(side => {
        addMesh(group, new THREE.CylinderGeometry(.025, .025, .65, 6), carbon,
          [side * .42, .88, .05], [0, 0, Math.PI / 2]);
      });
      addMesh(group, new THREE.BoxGeometry(.45, .12, .16), carbon, [0, .4, 1.95]);
    }

    if (isDrag || isOval || isDrift || isTime) {
      addMesh(group, new THREE.BoxGeometry(width * .9, .09, .18), carbon, [0, .93, 1.78]);
      addMesh(group, new THREE.BoxGeometry(.09, .32, .12), carbon, [-.48, .78, 1.72]);
      addMesh(group, new THREE.BoxGeometry(.09, .32, .12), carbon, [.48, .78, 1.72]);
    }

    // Diffuseur et bas de caisse.
    addMesh(group, new THREE.BoxGeometry(width * .75, .13, .3), carbon, [0, .27, 1.78]);
    [-1, 1].forEach(side => {
      addMesh(group, new THREE.BoxGeometry(.09, .13, length * .55), carbon, [side * width * .43, .31, 0]);
    });
  }

  // Quatre roues en caoutchouc, jantes et moyeux.
  const wheelRadius = isKart ? .19 : isF1 ? .39 : .35;
  const wheelWidth = isKart ? .13 : .23;
  const wheelPositions = [
    [-width * .52, wheelRadius, -length * .3],
    [ width * .52, wheelRadius, -length * .3],
    [-width * .52, wheelRadius,  length * .3],
    [ width * .52, wheelRadius,  length * .3]
  ];

  wheelPositions.forEach(([x, y, z], index) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    group.add(wheelGroup);

    const tire = addMesh(wheelGroup,
      new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24), rubber, [0, 0, 0]);
    tire.rotation.z = Math.PI / 2;

    const rim = addMesh(wheelGroup,
      new THREE.CylinderGeometry(wheelRadius * .57, wheelRadius * .57, wheelWidth + .015, 20), metal, [0, 0, 0]);
    rim.rotation.z = Math.PI / 2;

    const hub = addMesh(wheelGroup,
      new THREE.CylinderGeometry(wheelRadius * .17, wheelRadius * .17, wheelWidth + .025, 12), carbon, [0, 0, 0]);
    hub.rotation.z = Math.PI / 2;

    carWheels[index] = wheelGroup;
  });

  // Éclairage avant et arrière.
  [-1, 1].forEach(side => {
    addMesh(group, new THREE.BoxGeometry(.18, .07, .05), light,
      [side * width * .27, .49, -length * .48]);
    addMesh(group, new THREE.BoxGeometry(.2, .06, .04),
      new THREE.MeshBasicMaterial({ color: "#ff263f" }),
      [side * width * .28, .49, length * .48]);
  });

  group.scale.setScalar(scale);
  group.userData.vehicle = vehicle;
  return group;
}

function buildPath(track) {
  if (Array.isArray(track.points) && track.points.length >= 4) {
    const points = track.points.map(p => new THREE.Vector3(p.x * 70, 0, p.z * 70));
    return new THREE.CatmullRomCurve3(points, true, "centripetal");
  }

  const discipline = track.discipline;
  const count = discipline === "drag" ? 2 : 40;
  const points = [];
  const seed = Number(track.seed) || 7;
  const randomFactor = Math.sin(seed * 12.9898) * .5;

  if (discipline === "drag") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-120, 0, 0),
      new THREE.Vector3(120, 0, 0)
    ], false, "centripetal");
  }

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 2;
    const oval = discipline === "oval";
    const kart = discipline === "kart";
    const radiusX = kart ? 46 : 82;
    const radiusZ = kart ? 32 : 59;
    const turns = Number(track.turns) || 10;

    const variation = oval ? 1 :
      1 + .13 * Math.sin(angle * Math.max(2, turns / 2) + randomFactor) +
      .08 * Math.cos(angle * 3 + seed);

    const x = Math.cos(angle) * radiusX * variation +
      (oval ? 0 : Math.sin(angle * 2 + seed) * 7);
    const z = Math.sin(angle) * radiusZ * variation +
      (oval ? 0 : Math.cos(angle * 3 + seed) * 5);

    let y = 0;
    if (discipline === "hill" || discipline === "rally" || track.elevation) {
      y = Math.sin(t * Math.PI * 4) * 3 + Math.sin(t * Math.PI * 9) * .7;
    }

    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points, true, "centripetal");
}

function createTrack(track) {
  path = buildPath(track);
  roadWidth = Number(track.width) || (track.discipline === "kart" ? 9 : 14);

  const divisions = 800;
  const vertices = [];
  const indices = [];
  const uvs = [];

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const point = path.getPointAt(t);
    const tangent = path.getTangentAt(t).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

    const left = point.clone().addScaledVector(side, -roadWidth / 2);
    const right = point.clone().addScaledVector(side, roadWidth / 2);

    vertices.push(left.x, left.y + .04, left.z);
    vertices.push(right.x, right.y + .04, right.z);
    uvs.push(0, t * 45, 1, t * 45);

    if (i < divisions) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: "#34363d", roughness: .92, metalness: .02, side: THREE.DoubleSide
  });

  const road = new THREE.Mesh(geometry, roadMaterial);
  road.receiveShadow = true;
  scene.add(road);

  // Vibreurs rouges et blancs.
  const curbMaterials = [
    material("#f2f2ef", .85),
    material("#ff5728", .75)
  ];

  for (let i = 0; i < divisions; i += 4) {
    const t = i / divisions;
    const point = path.getPointAt(t);
    const tangent = path.getTangentAt(t).normalize();
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

    [-1, 1].forEach(sideSign => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(.8, .08, 1.5),
        curbMaterials[Math.floor(i / 4) % 2]
      );
      const edgePoint = point.clone().addScaledVector(side, sideSign * (roadWidth / 2 + .45));
      curb.position.set(edgePoint.x, edgePoint.y + .09, edgePoint.z);
      curb.rotation.y = Math.atan2(tangent.x, tangent.z);
      scene.add(curb);
    });
  }

  // Lignes de départ et d'arrivée.
  const start = path.getPointAt(.01);
  const tangent = path.getTangentAt(.01);
  const startLine = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth, .055, 1.4),
    new THREE.MeshBasicMaterial({ color: "#ffffff" })
  );
  startLine.position.copy(start);
  startLine.position.y += .12;
  startLine.rotation.y = Math.atan2(tangent.x, tangent.z);
  scene.add(startLine);

  // Marqueurs latéraux pour donner de la profondeur au circuit.
  scenery = [];
  const treeMaterial = material("#24482e", 1);
  const trunkMaterial = material("#55402e", 1);

  for (let i = 0; i < 100; i++) {
    if (track.discipline === "drag" && i > 35) break;
    const t = (i / 100 + .017) % 1;
    const point = path.getPointAt(t);
    const tangentAt = path.getTangentAt(t);
    const side = new THREE.Vector3(tangentAt.z, 0, -tangentAt.x).normalize();
    const sign = i % 2 ? 1 : -1;
    const offset = roadWidth / 2 + 7 + (i % 5) * 2;
    const position = point.clone().addScaledVector(side, sign * offset);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .25, 1.6, 7), trunkMaterial);
    trunk.position.set(position.x, position.y + .8, position.z);
    trunk.castShadow = true;
    scene.add(trunk);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.2 + (i % 3) * .2, 3.2, 8), treeMaterial);
    crown.position.set(position.x, position.y + 2.8, position.z);
    crown.castShadow = true;
    scene.add(crown);
    scenery.push(trunk, crown);
  }

  // Un circuit de dragster est volontairement rectiligne.
}

function setupScene() {
  const view = $("game-view");

  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;

  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color("#a5bac8");
  scene.fog = new THREE.Fog("#a5bac8", 150, 550);

  camera = new THREE.PerspectiveCamera(65, view.clientWidth / view.clientHeight, .1, 1500);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(view.clientWidth, view.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Le canvas du moteur reste derrière les éléments HTML du HUD.
  view.insertBefore(renderer.domElement, view.firstChild);

  scene.add(new THREE.HemisphereLight("#e9f2ff", "#56604b", 2.1));

  const sun = new THREE.DirectionalLight("#fff4df", 3.0);
  sun.position.set(-80, 130, 65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 1800),
    material("#52654b", 1, 0)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  ground.receiveShadow = true;
  scene.add(ground);
}

function resetCar() {
  if (!car || !path) return;

  progress = .01;
  lateral = 0;
  speed = 0;
  steering = 0;
  elapsed = 0;
  lap = 1;
  wheelRotation = 0;
  lastTime = performance.now();

  const point = path.getPointAt(progress);
  const tangent = path.getTangentAt(progress).normalize();

  car.position.copy(point);
  car.position.y += .2;
  car.rotation.set(0, Math.atan2(tangent.x, tangent.z) + Math.PI, 0);

  $("speed").textContent = "0";
  $("timer").textContent = formatTime(0);
  $("lap").textContent = currentMode === "practice" ? "ESSAIS" : "1 / 3";
}

function startCountdown() {
  starting = true;
  countdownValue = 3;
  countdownEnd = performance.now() + 3000;
  $("countdown").classList.remove("hidden");
  $("countdown").textContent = "3";
}

function updateCar(delta) {
  if (!running || !car || !path || starting) return;

  const forward = keys.ArrowUp || keys.z || keys.Z || keys.w || keys.W;
  const brake = keys.ArrowDown || keys.s || keys.S;
  const left = keys.ArrowLeft || keys.q || keys.Q || keys.a || keys.A;
  const right = keys.ArrowRight || keys.d || keys.D;
  const handbrake = keys[" "];

  const vehicle = currentCar || {};
  const maxKmh = Number(vehicle.maxSpeed) || 250;
  const maxSpeed = maxKmh / 3.6;
  const powerFactor = THREE.MathUtils.clamp((Number(vehicle.power) || 500) / 700, .45, 1.5);
  const grip = THREE.MathUtils.clamp(Number(vehicle.grip) || .8, .35, 1);

  if (forward) speed += (11 + powerFactor * 9) * delta;
  else speed -= 2.8 * delta;

  if (brake) speed -= 24 * delta;
  if (handbrake) speed -= 9 * delta;

  speed = THREE.MathUtils.clamp(speed, 0, maxSpeed);

  const steeringInput = (right ? 1 : 0) - (left ? 1 : 0);
  steering = THREE.MathUtils.damp(steering, steeringInput, 5.5, delta);

  const turnFactor = (0.12 + speed * .006) * (handbrake ? 1.55 : 1) / Math.max(.65, grip);
  lateral += steering * turnFactor * delta * 10;
  lateral *= Math.pow(handbrake ? .993 : .965, delta * 60);
  lateral = THREE.MathUtils.clamp(lateral, -roadWidth * .9, roadWidth * .9);

  // La vitesse de progression dépend de la longueur du circuit.
  const trackLength = Math.max(1, Number(currentTrack.length) || 4);
  const lapDistance = trackLength * 1000;
  const metresTravelled = speed * delta;
  const progressDelta = metresTravelled / lapDistance;

  progress += progressDelta;
  if (progress >= 1) {
    progress -= 1;
    lap++;
    if (currentMode !== "practice" && lap > 3) {
      running = false;
      $("countdown").classList.remove("hidden");
      $("countdown").textContent = "ARRIVÉE";
      return;
    }
  }

  const point = path.getPointAt(progress);
  const tangent = path.getTangentAt(progress).normalize();
  const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();

  car.position.copy(point).addScaledVector(side, lateral);
  car.position.y += .2 + Math.abs(steering) * .025;

  car.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI - steering * Math.min(.42, speed / 130);
  car.rotation.z = -steering * Math.min(speed / 90, 1) * .09;

  wheelRotation -= speed * delta * 1.5;
  carWheels.forEach(wheel => {
    if (wheel) wheel.rotation.x = wheelRotation;
  });

  elapsed += delta;
  $("speed").textContent = String(Math.round(speed * 3.6));
  $("timer").textContent = formatTime(elapsed);
  $("lap").textContent = currentMode === "practice" ? "ESSAIS" : `${Math.min(lap, 3)} / 3`;

  if (Math.abs(lateral) > roadWidth * .43) {
    speed = Math.max(0, speed - 12 * delta);
  }
}

function updateCamera(delta) {
  if (!car || !camera) return;

  const rotation = car.rotation.y;
  const forward = new THREE.Vector3(-Math.sin(rotation), 0, -Math.cos(rotation));
  const target = car.position.clone();

  let desired;

  if (currentCamera === "hood") {
    desired = car.position.clone().add(forward.clone().multiplyScalar(-1.0));
    desired.y += 1.35;
    target.add(forward.clone().multiplyScalar(20));
  } else if (currentCamera === "cockpit") {
    desired = car.position.clone().add(forward.clone().multiplyScalar(-.25));
    desired.y += 1.0;
    target.add(forward.clone().multiplyScalar(25));
  } else if (currentCamera === "side") {
    desired = car.position.clone().add(new THREE.Vector3(5, 2.5, 0));
    target.add(forward.clone().multiplyScalar(4));
  } else if (currentCamera === "top") {
    desired = car.position.clone().add(new THREE.Vector3(0, 35, 4));
  } else {
    desired = car.position.clone()
      .add(forward.clone().multiplyScalar(-10))
      .add(new THREE.Vector3(0, 4.3, 0));
    target.add(forward.clone().multiplyScalar(12));
  }

  camera.position.lerp(desired, 1 - Math.exp(-4 * delta));
  camera.lookAt(target);
}

function animate(now) {
  if (!running) {
    animationId = null;
    return;
  }

  animationId = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .04);

  if (starting) {
    const remaining = countdownEnd - now;
    const value = Math.max(0, Math.ceil(remaining / 1000));
    if (value !== countdownValue) {
      countdownValue = value;
      $("countdown").textContent = value > 0 ? String(value) : "GO !";
    }
    if (remaining <= -500) {
      starting = false;
      $("countdown").classList.add("hidden");
      lastTime = now;
    }
  } else {
    updateCar(delta);
  }

  updateCamera(delta);
  renderer.render(scene, camera);
}

export function setCamera(mode) {
  const valid = ["chase", "hood", "cockpit", "side", "top"];
  if (valid.includes(mode)) currentCamera = mode;
}

export function startRace(track, selectedCar, mode = "time") {
  stopRace();

  currentTrack = track;
  currentCar = selectedCar;
  currentMode = mode;

  carWheels = [];
  scenery = [];
  lateral = 0;
  progress = 0;
  speed = 0;
  elapsed = 0;
  lap = 1;
  currentCamera = "chase";

  setupScene();
  createTrack(track);

  car = createCar(selectedCar);
  scene.add(car);

  resetCar();
  running = true;
  starting = false;

  $("game-loading").style.display = "none";
  document.querySelectorAll("[data-camera]").forEach(button => {
    button.classList.toggle("active", button.dataset.camera === "chase");
  });

  startCountdown();
  clock.start();
  animationId = requestAnimationFrame(animate);
}

export function resetRace() {
  if (!car || !path) return;
  resetCar();
  starting = false;
  $("countdown").classList.add("hidden");
}

export function stopRace() {
  running = false;
  starting = false;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  Object.keys(keys).forEach(key => { keys[key] = false; });
}

window.addEventListener("keydown", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }

  keys[key] = true;
  if (key === "r") resetRace();
});

window.addEventListener("keyup", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => { keys[key] = false; });
});

window.addEventListener("resize", () => {
  if (!renderer || !camera) return;
  const view = $("game-view");
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(view.clientWidth, view.clientHeight);
});
