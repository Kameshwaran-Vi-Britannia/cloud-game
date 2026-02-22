// --------- FIREBASE CONFIG ---------
const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.appspot.com",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --------- DOM ELEMENTS ---------
const authCard = document.getElementById('authCard');
const nameCard = document.getElementById('nameCard');
const gameCard = document.getElementById('gameCard');
const authMsg = document.getElementById('authMsg');
const welcomeEmail = document.getElementById('welcomeEmail');
const gamerNameInput = document.getElementById('gamerName');
const scoreDisplay = document.getElementById('scoreDisplay');
const leaderboardEl = document.getElementById('leaderboard');
const gameMsg = document.getElementById('gameMsg');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_W = 360;
const CANVAS_H = 480;

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// --------- GAME STATE ---------
let user = null;
let gamerName = '';
let score = 0;
let gameRunning = false;
let rafId = null;
let obstacles = [];
let lastObstacleAt = 0;

// --------- PLAYER (POLISHED) ---------
let player = {
  x: CANVAS_W / 2 - 20,
  y: CANVAS_H - 60,
  size: 40,
  speed: 4,
  vx: 0
};

// --------- AUTH FUNCTIONS ---------
window.signUp = function () {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;

  if (!email || !pass) return showMessage("Enter email & password");

  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => showMessage("Account created!", "success"))
    .catch(err => showMessage(err.message));
};

window.login = function () {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;

  if (!email || !pass) return showMessage("Enter email & password");

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => showMessage("Login successful!", "success"))
    .catch(err => showMessage(err.message));
};

window.logout = function () {
  auth.signOut().then(() => location.reload());
};

auth.onAuthStateChanged(async (u) => {
  user = u;

  if (user) {
    authCard.style.display = 'none';
    nameCard.style.display = 'block';
    welcomeEmail.textContent = user.email;

    const doc = await db.collection('players').doc(user.uid).get();
    if (doc.exists && doc.data().gamerName) {
      gamerName = doc.data().gamerName;
      gamerNameInput.value = gamerName;
      showGameArea();
    }

    loadLeaderboard();
  }
});

// --------- GAMER NAME ---------
window.setGamerName = async function () {
  const name = gamerNameInput.value.trim();

  if (!name) return showMessage("Enter gamer name");

  gamerName = name;

  await db.collection('players').doc(user.uid).set({
    email: user.email,
    gamerName: gamerName,
    highscore: 0
  }, { merge: true });

  showGameArea();
};

// --------- UI HELPERS ---------
function showGameArea() {
  nameCard.style.display = 'none';
  gameCard.style.display = 'block';
}

function showMessage(msg, type = "error") {
  authMsg.textContent = msg;
  authMsg.style.color = type === "error" ? "#ff9b9b" : "#b7f0e9";
}

// --------- GAME LOGIC ---------
function spawnObstacle() {
  const size = 30;
  const x = Math.random() * (CANVAS_W - size);

  obstacles.push({
    x,
    y: -size,
    size,
    speed: 2 + Math.random() * 2
  });
}

function update(delta) {
  lastObstacleAt += delta;

  if (lastObstacleAt > 700 - Math.min(score * 5, 400)) {
    lastObstacleAt = 0;
    spawnObstacle();
  }

  obstacles.forEach(o => o.y += o.speed);
  obstacles = obstacles.filter(o => o.y < CANVAS_H + 50);

  // SMOOTH MOVEMENT
  player.x += player.vx;

  if (player.x < 0) player.x = 0;
  if (player.x > CANVAS_W - player.size)
    player.x = CANVAS_W - player.size;

  // friction / easing
  player.vx *= 0.9;

  detectCollision();

  score += Math.floor(delta / 16);
  scoreDisplay.textContent = score;
}

function detectCollision() {
  for (let o of obstacles) {
    if (
      player.x < o.x + o.size &&
      player.x + player.size > o.x &&
      player.y < o.y + o.size &&
      player.y + player.size > o.y
    ) {
      endGame();
    }
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Player
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Obstacles
  ctx.fillStyle = "red";
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.size, o.size));

  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 10, 20);
}

// --------- LOOP ---------
let lastTime = 0;

function loop(time) {
  if (!gameRunning) return;

  const delta = time - lastTime;
  lastTime = time;

  update(delta);
  render();

  rafId = requestAnimationFrame(loop);
}

window.startGame = function () {
  obstacles = [];
  score = 0;
  gameRunning = true;
  lastTime = performance.now();

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
};

// --------- POLISHED CONTROLS ---------
window.moveLeft = function () {
  player.vx = -player.speed;
};

window.moveRight = function () {
  player.vx = player.speed;
};

window.stopMove = function () {
  player.vx = 0;
};

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === "ArrowLeft") moveLeft();
  if (e.key === "ArrowRight") moveRight();
});

document.addEventListener('keyup', stopMove);

// Mobile buttons
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

leftBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  moveLeft();
});
leftBtn.addEventListener('touchend', stopMove);
leftBtn.addEventListener('click', moveLeft);

rightBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  moveRight();
});
rightBtn.addEventListener('touchend', stopMove);
rightBtn.addEventListener('click', moveRight);

// --------- END GAME ---------
function endGame() {
  gameRunning = false;
  cancelAnimationFrame(rafId);
  saveScore();
}

async function saveScore() {
  if (!user) return;

  const ref = db.collection('players').doc(user.uid);
  const snap = await ref.get();

  const prev = snap.exists ? snap.data().highscore : 0;

  if (score > prev) {
    await ref.set({ highscore: score }, { merge: true });
  }

  loadLeaderboard();
}

// --------- LEADERBOARD ---------
async function loadLeaderboard() {
  const snap = await db.collection('players')
    .orderBy('highscore', 'desc')
    .limit(10)
    .get();

  leaderboardEl.innerHTML = "";

  let rank = 1;
  snap.forEach(doc => {
    const data = doc.data();

    const li = document.createElement("li");
    li.textContent = `${rank}. ${data.gamerName} — ${data.highscore}`;
    leaderboardEl.appendChild(li);

    rank++;
  });
}

loadLeaderboard();
