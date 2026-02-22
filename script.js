Cloud Dodge — upgraded controls + colors + multiplier + game-over-on-exit */

// ---------- Firebase config (compat) ----------
const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.appspot.com",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // optional usage later

// ---------- DOM ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const multBadge = document.getElementById('multBadge');
const startBtn = document.getElementById('startBtn');
const gameOverEl = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const playAgain = document.getElementById('playAgain') || document.getElementById('playAgain'); // safety

// logical canvas size
const W = 360, H = 480;
canvas.width = W;
canvas.height = H;

// ---------- state ----------
let running = false;
let raf = null;
let lastT = 0;
let score = 0;
let obstacles = [];
let player;
let multiplierActive = false;
let multiplierTimer = 0;

// ---------- player (fluid) ----------
function makePlayer(){
  return {
    x: W/2 - 20,
    y: H - 70,
    size: 44,
    vx: 0,
    speed: 4,
    maxOutMargin: 18 // how far off edge triggers exit
  };
}
player = makePlayer();

// ---------- obstacle factory ----------
const OB_COLORS = ['#ef4444','#f97316','#f59e0b','#fbbf24','#10b981','#3b82f6','#6366f1','#06b6d4'];
function createObstacle(isMult=false){
  const size = isMult ? 34 : (20 + Math.floor(Math.random()*22));
  const x = Math.random() * (W - size);
  const speed = 1.6 + Math.random()*2.0 + (score/2000); // slight ramp with score
  return {
    x, y: -size - Math.random()*50, size, speed,
    color: isMult ? '#d946ef' : OB_COLORS[Math.floor(Math.random()*OB_COLORS.length)],
    isMult
  };
}

// ---------- spawn logic ----------
function maybeSpawn(){
  // spawn base on chance; increase chance with score
  const baseChance = 0.018 + Math.min(0.032, score/12000);
  if(Math.random() < baseChance) {
    // occasional multiplier
    if(Math.random() < 0.12) obstacles.push(createObstacle(true));
    else obstacles.push(createObstacle(false));
  }
}

// ---------- update (delta ms) ----------
function update(dt){
  // spawn
  maybeSpawn();

  // update obstacles
  for(let i=obstacles.length-1;i>=0;i--){
    obstacles[i].y += obstacles[i].speed;
    if(obstacles[i].y > H + 60) obstacles.splice(i,1);
  }

  // player physics
  player.x += player.vx;
  // allow small overshoot; if exceed margin -> game over (player "got out")
  if(player.x < -player.maxOutMargin || player.x > W - player.size + player.maxOutMargin){
    // out of bounds -> game over
    doGameOver();
    return;
  }
  // clamp visually so doesn't fully disappear (but still allow out detection)
  if(player.x < -player.maxOutMargin) player.x = -player.maxOutMargin;
  if(player.x > W - player.size + player.maxOutMargin) player.x = W - player.size + player.maxOutMargin;

  // friction / easing
  player.vx *= 0.88;

  // collision detection
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i];
    if(rectsOverlap(player.x,player.y,player.size,player.size, o.x,o.y,o.size,o.size)){
      if(o.isMult){
        // activate 2x for 5 seconds
        multiplierActive = true;
        multiplierTimer = 5000;
        multBadge.classList.remove('hidden');
        // remove multiplier object
        obstacles.splice(i,1);
      } else {
        // normal obstacle collision -> game over
        doGameOver();
        return;
      }
    }
  }

  // score increment: base rate * dt, doubled when multiplierActive
  const baseGain = dt * 0.05; // tuning: frames ~60 -> about 3 per second
  score += multiplierActive ? Math.round(baseGain*2) : Math.round(baseGain);
  scoreDisplay.textContent = score;

  // handle multiplier timer
  if(multiplierActive){
    multiplierTimer -= dt;
    if(multiplierTimer <= 0){
      multiplierActive = false;
      multBadge.classList.add('hidden');
    }
  }
}

// ---------- draw ----------
function draw(){
  // clear with subtle gradient
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#071028'); g.addColorStop(1,'#071223');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // obstacles
  for(const o of obstacles){
    ctx.fillStyle = o.color;
    roundRect(ctx, o.x, o.y, o.size, o.size, 6, true);
  }

  // player (always cyan)
  ctx.fillStyle = '#06b6d4';
  roundRect(ctx, player.x, player.y, player.size, player.size, 8, true);

  // small HUD inside canvas (optional)
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '14px "Segoe UI", Arial';
  ctx.fillText('Score: '+score, 8, 20);

  // multiplier indicator near top-right of canvas
  if(multiplierActive){
    ctx.fillStyle = '#d946ef';
    ctx.font = '700 16px "Segoe UI", Arial';
    ctx.fillText('×2 ACTIVE', W - 100, 24);
  }
}

// ---------- main loop ----------
function loop(ts){
  if(!running) return;
  const dt = Math.min(40, ts - (lastT||ts)); // clamp dt small
  lastT = ts;
  update(dt);
  draw();
  raf = requestAnimationFrame(loop);
}

// ---------- helpers ----------
function roundRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.closePath();
  if(fill) ctx.fill();
}
function rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
  return !(x1 + w1 < x2 || x1 > x2 + w2 || y1 + h1 < y2 || y1 > y2 + h2);
}

// ---------- game controls ----------
function startGame(){
  // reset
  running = true;
  obstacles = [];
  score = 0;
  player = makePlayer();
  multiplierActive = false;
  multiplierTimer = 0;
  multBadge.classList.add('hidden');
  scoreDisplay.textContent = score;
  gameOverEl.classList.add('hidden');
  lastT = performance.now();
  if(raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

// safe guard wrapper to avoid double-calls
function doGameOver(){
  if(!running) return;
  running = false;
  finalScore.textContent = score;
  gameOverEl.classList.remove('hidden');
  // cancel loop
  if(raf) cancelAnimationFrame(raf);
  // (optional) save to DB here if you want
}

// ---------- input: keyboard ----------
document.addEventListener('keydown', e=>{
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') player.vx = -player.speed;
  if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') player.vx = player.speed;
});
document.addEventListener('keyup', e=>{
  // stop on keyup: better feel if user releases
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
    player.vx = 0;
  }
});

// ---------- input: mobile buttons (hold support) ----------
leftBtn.addEventListener('touchstart', e=>{ e.preventDefault(); player.vx = -player.speed; });
leftBtn.addEventListener('touchend', e=>{ e.preventDefault(); player.vx = 0; });
leftBtn.addEventListener('mousedown', ()=>player.vx = -player.speed);
leftBtn.addEventListener('mouseup', ()=>player.vx = 0);
leftBtn.addEventListener('mouseleave', ()=>player.vx = 0);

rightBtn.addEventListener('touchstart', e=>{ e.preventDefault(); player.vx = player.speed; });
rightBtn.addEventListener('touchend', e=>{ e.preventDefault(); player.vx = 0; });
rightBtn.addEventListener('mousedown', ()=>player.vx = player.speed);
rightBtn.addEventListener('mouseup', ()=>player.vx = 0);
rightBtn.addEventListener('mouseleave', ()=>player.vx = 0);

// ---------- UI hookup ----------
startBtn.addEventListener('click', startGame);
const playAgainBtn = document.getElementById('playAgain');
if(playAgainBtn) playAgainBtn.addEventListener('click', startGame);

// small helper to create the initial player object (used on reset)
function makePlayer(){
  return {
    x: W/2 - 22,
    y: H - 80,
    size: 44,
    vx: 0,
    speed: 4,
    maxOutMargin: 22
  };
}

// ---------- init ----------
scoreDisplay.textContent = '0';
multBadge.classList.add('hidden
