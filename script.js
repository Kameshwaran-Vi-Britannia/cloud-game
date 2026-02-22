// --------- FIREBASE CONFIG (compat style) ---------
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

// --------- DOM refs ---------
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const authMsg = document.getElementById('authMsg');
const authCard = document.getElementById('authCard');
const nameCard = document.getElementById('nameCard');
const welcomeEmail = document.getElementById('welcomeEmail');
const gamerNameInput = document.getElementById('gamerName');
const gameCard = document.getElementById('gameCard');
const scoreDisplay = document.getElementById('scoreDisplay');
const leaderboardEl = document.getElementById('leaderboard');
const gameMsg = document.getElementById('gameMsg');

let user = null;
let gamerName = '';
let score = 0;
let gameRunning = false;
let rafId = null;
let obstacles = [];
let lastObstacleAt = 0;
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// responsive canvas sizing (use CSS width but keep logical coordinate space)
const CANVAS_W = 360, CANVAS_H = 480;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// Player
let player = { x: CANVAS_W/2 - 20, y: CANVAS_H - 60, size: 40 };

// ----------------- AUTH HANDLERS -----------------
window.signUp = function() {
  clearMessage();
  const email = emailInput.value.trim();
  const pass = passInput.value;
  if (!email || !pass) return showMessage('Enter email and password');

  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      showMessage('Account created. Please set a gamer name.', 'success');
      // auto sign-in triggers onAuthStateChanged; keep UX simple
    })
    .catch(err => showMessage(err.message));
};

window.login = function() {
  clearMessage();
  const email = emailInput.value.trim();
  const pass = passInput.value;
  if (!email || !pass) return showMessage('Enter email and password');

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => showMessage('Logged in. Set a gamer name to proceed.', 'success'))
    .catch(err => showMessage(err.message));
};

window.logout = function() {
  auth.signOut().then(()=> location.reload());
};

// respond to auth state
auth.onAuthStateChanged(async (u) => {
  user = u;
  if (user) {
    // show name card
    authCard.style.display = 'none';
    nameCard.style.display = 'block';
    welcomeEmail.textContent = user.email;
    // fetch saved gamer name if exists
    const doc = await db.collection('players').doc(user.uid).get();
    if (doc.exists && doc.data().gamerName) {
      gamerName = doc.data().gamerName;
      gamerNameInput.value = gamerName;
      // skip name card if already set
      // show game area immediately
      showGameArea();
    }
    loadLeaderboard();
  } else {
    authCard.style.display = 'block';
    nameCard.style.display = 'none';
    gameCard.style.display = 'none';
  }
});

// Set gamer name (save to players collection)
window.setGamerName = async function() {
  clearMessage();
  const name = gamerNameInput.value.trim();
  if (!user) return showMessage('Login first');
  if (!name) return showMessage('Enter a gamer name');

  gamerName = name;
  await db.collection('players').doc(user.uid).set({
    email: user.email,
    gamerName: gamerName,
    highscore: 0
  }, { merge: true });

  showMessage('Gamer name saved. Ready to play!', 'success');
  showGameArea();
  loadLeaderboard();
};

// ----------------- SMALL HELPERS -----------------
function showMessage(msg, type='error') {
  authMsg.textContent = msg;
  authMsg.style.color = type === 'error' ? '#ff9b9b' : '#b7f0e9';
}
function clearMessage(){
  authMsg.textContent = '';
}

// ----------------- UI toggles -----------------
function showGameArea(){
  nameCard.style.display = 'none';
  gameCard.style.display = 'block';
  gameMsg.textContent = 'Use left/right arrows or buttons. Survive to score.';
}

// ----------------- GAME LOOP & LOGIC -----------------
function spawnObstacle(){
  const size = 28 + Math.floor(Math.random()*24);
  const x = Math.max(0, Math.random()*(CANVAS_W - size));
  obstacles.push({ x, y: -size, size, speed: 2 + Math.random()*2 });
}

function update(delta){
  // spawn logic
  lastObstacleAt += delta;
  if (lastObstacleAt > 700 - Math.min(400, score*6)) { // increasing difficulty
    lastObstacleAt = 0;
    spawnObstacle();
  }

  // update obstacles
  for (let i = obstacles.length -1; i >= 0; i--){
    obstacles[i].y += obstacles[i].speed;
    if (obstacles[i].y > CANVAS_H + 50) obstacles.splice(i,1);
  }

  // collision
  for (let o of obstacles){
    if (rectIntersect(player.x, player.y, player.size, player.size, o.x, o.y, o.size, o.size)){
      endGame();
      return;
    }
  }

  // increase score
  score += Math.floor(delta/16); // approx per frame
  scoreDisplay.textContent = score;
}

function render(){
  // clear
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,CANVAS_W, CANVAS_H);

  // player
  ctx.fillStyle = '#06b6d4';
  roundRect(ctx, player.x, player.y, player.size, player.size, 8, true, false);

  // obstacles
  for (let i=0;i<obstacles.length;i++){
    ctx.fillStyle = '#ff6b6b';
    const o = obstacles[i];
    roundRect(ctx, o.x, o.y, o.size, o.size, 6, true, false);
  }

  // HUD
  ctx.fillStyle = 'white';
  ctx.font = '16px Inter, Arial';
  ctx.fillText('Score: ' + score, 10, 22);
}

// main driver
let lastTime = 0;
function loop(time){
  if (!gameRunning) return;
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  render();
  rafId = requestAnimationFrame(loop);
}

window.startGame = function(){
  if (!user) return showMessage('Login first');
  if (!gamerName) return showMessage('Set a gamer name first');

  // reset state
  obstacles = [];
  score = 0;
  player.x = CANVAS_W/2 - player.size/2;
  lastObstacleAt = 0;
  gameRunning = true;
  lastTime = performance.now();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
  gameMsg.textContent = '';
};

// Move functions (global for buttons & keyboard)
window.moveLeft = function(){
  player.x = Math.max(0, player.x - 36);
};
window.moveRight = function(){
  player.x = Math.min(CANVAS_W - player.size, player.x + 36);
};

// touch / click handlers for mobile buttons
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

leftBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); moveLeft(); });
leftBtn.addEventListener('click', ()=> moveLeft());
rightBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); moveRight(); });
rightBtn.addEventListener('click', ()=> moveRight());

// keyboard
document.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
});

// helper to draw rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke){
  if (r===undefined) r=5;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
function rectIntersect(x1,y1,w1,h1,x2,y2,w2,h2){
  return !(x1 + w1 < x2 || x1 > x2 + w2 || y1 + h1 < y2 || y1 > y2 + h2);
}

// ----------------- END GAME & SAVE -----------------
function endGame(){
  gameRunning = false;
  if (rafId) cancelAnimationFrame(rafId);
  gameMsg.textContent = 'Game Over • Saving score...';
  saveHighscore();
}

async function saveHighscore(){
  if (!user) {
    gameMsg.textContent = 'Not signed in — score not saved.';
    return;
  }
  try {
    const playerRef = db.collection('players').doc(user.uid);
    const snapshot = await playerRef.get();
    let prev = 0;
    if (snapshot.exists) prev = snapshot.data().highscore || 0;

    if (score > prev){
      await playerRef.set({
        email: user.email,
        gamerName: gamerName,
        highscore: score
      }, { merge: true });
    }
    gameMsg.textContent = 'Score saved!';
    loadLeaderboard(); // refresh
  } catch (err){
    gameMsg.textContent = 'Save failed: ' + err.message;
  }
}

// ----------------- LEADERBOARD -----------------
async function loadLeaderboard(){
  try {
    const snap = await db.collection('players')
      .orderBy('highscore','desc')
      .limit(10)
      .get();

    leaderboardEl.innerHTML = '';
    let rank = 1;
    snap.forEach(doc=>{
      const data = doc.data();
      const li = document.createElement('li');
      li.innerHTML = `<div><strong>${rank}. ${escapeHtml(data.gamerName || 'Unknown')}</strong><div class="meta">${escapeHtml(data.email || '')}</div></div><div>${data.highscore || 0}</div>`;
      leaderboardEl.appendChild(li);
      rank++;
    });

  } catch (err) {
    console.error(err);
  }
}

// escape simple HTML
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// ----------------- PAGE HOOKUPS -----------------
document.getElementById('btnSignUp').addEventListener('click', window.signUp);
document.getElementById('btnLogin').addEventListener('click', window.login);
document.getElementById('btnLogout')?.addEventListener('click', window.logout);
document.getElementById('btnSetName').addEventListener('click', window.setGamerName);
document.getElementById('btnStart').addEventListener('click', window.startGame);

// load leaderboard on start (shows zeros until players exist)
loadLeaderboard();
