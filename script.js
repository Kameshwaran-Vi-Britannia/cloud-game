// -------- FIREBASE CONFIG --------
const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.appspot.com",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// -------- DOM REFS --------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const startBtn = document.getElementById("startBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreEl = document.getElementById("finalScore");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

canvas.width = 360;
canvas.height = 480;

// -------- GAME STATE --------
let score = 0;
let running = false;
let obstacles = [];
let lastTime = 0;
let rafId;

// -------- PLAYER --------
let player = {
  x: canvas.width/2 - 20,
  y: canvas.height - 60,
  size: 40,
  vx: 0,
  speed: 4
};

// -------- MULTIPLIER BLOCK --------
// will be special block that doubles score
function spawnMultiplier(){
  const size = 30;
  const x = Math.random() * (canvas.width - size);
  return { x, y: -size, size, speed: 2.5, isMulti:true };
}

// -------- NORMAL OBSTACLE --------
function spawnObstacle(){
  const colors = ["#ef4444","#fbbf24","#3b82f6","#10b981"];
  const size = 28;
  const x = Math.random() * (canvas.width - size);
  return { x, y:-size, size, speed: 1.8 + Math.random()*1.8, c: colors[Math.floor(Math.random()*colors.length)], isMulti:false }
}

// -------- START GAME --------
startBtn.onclick = () => startGame();

function startGame(){
  obstacles = [];
  score = 0;
  running = true;
  player.x = canvas.width/2 - player.size/2;
  scoreDisplay.textContent = score;
  gameOverScreen.classList.add("hidden");
  lastTime = performance.now();
  if(rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

// -------- UPDATE --------
function update(dt){
  if(!running) return;

  // spawn obstacles
  if(Math.random() < 0.02) {
    if(Math.random() < 0.15) obstacles.push(spawnMultiplier());
    else obstacles.push(spawnObstacle());
  }

  // move obstacles
  obstacles.forEach(o => o.y += o.speed);

  // clean off bottom
  obstacles = obstacles.filter(o => o.y < canvas.height+50);

  // move player
  player.x += player.vx;
  if(player.x < 0) player.x = 0;
  if(player.x > canvas.width - player.size) player.x = canvas.width - player.size;

  // collision
  for(let o of obstacles){
    if(
      player.x < o.x+o.size &&
      player.x+player.size > o.x &&
      player.y < o.y+o.size &&
      player.y+player.size > o.y
    ){
      if(o.isMulti){
        score += 50; // bonus
        scoreDisplay.textContent = score;
        obstacles = obstacles.filter(x=>x!==o);
      } else {
        endGame();
      }
    }
  }

  // increase score simply by survival
  score += Math.floor(dt / 20);
  scoreDisplay.textContent = score;
}

// -------- DRAW --------
function draw(){
  // clear
  ctx.fillStyle="#000";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // draw player
  ctx.fillStyle="#06b6d4";
  roundRect(ctx,player.x,player.y,player.size,player.size,6,true);

  // draw obstacles
  for(let o of obstacles){
    if(o.isMulti) ctx.fillStyle="#d946ef";
    else ctx.fillStyle = o.c;
    roundRect(ctx,o.x,o.y,o.size,o.size,5,true);
  }
}

// -------- GAME LOOP --------
function gameLoop(time){
  if(!running) return;
  const dt = time - lastTime;
  lastTime = time;

  update(dt);
  draw();
  rafId = requestAnimationFrame(gameLoop);
}

// -------- END GAME --------
function endGame(){
  running = false;
  finalScoreEl.innerText = score;
  gameOverScreen.classList.remove("hidden");
  if(rafId) cancelAnimationFrame(rafId);

  // save score if authenticated
  // optional
}

// -------- HELPERS --------
function roundRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.closePath();
  if(fill) ctx.fill();
}

// -------- CONTROLS --------
window.moveLeft = function(){ player.vx = -player.speed; }
window.moveRight = function(){ player.vx = player.speed; }
window.stopMove = function(){ player.vx = 0; }

document.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft") moveLeft();
  if(e.key==="ArrowRight") moveRight();
});
document.addEventListener("keyup",stopMove);

// mobile controls
leftBtn.addEventListener('touchstart',()=>moveLeft());
leftBtn.addEventListener('touchend',()=>stopMove());
leftBtn.addEventListener('click',()=>moveLeft());

rightBtn.addEventListener('touchstart',()=>moveRight());
rightBtn.addEventListener('touchend',()=>stopMove());
rightBtn.addEventListener('click',()=>moveRight());
