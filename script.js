import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.firebasestorage.app",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = { x: 130, y: 360, size: 20 };
let obstacles = [];
let score = 0;
let gameRunning = false;
let userEmail = "";

function drawPlayer() {
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function drawObstacles() {
  ctx.fillStyle = "red";
  obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.size, o.size));
}

function updateObstacles() {
  obstacles.forEach(o => o.y += 3);

  if (Math.random() < 0.02) {
    obstacles.push({
      x: Math.random() * 280,
      y: 0,
      size: 20
    });
  }

  obstacles = obstacles.filter(o => o.y < 400);
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

function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, 300, 400);

  drawPlayer();
  drawObstacles();
  updateObstacles();
  detectCollision();

  score++;
  ctx.fillStyle = "white";
  ctx.fillText("Score: " + score, 10, 20);

  requestAnimationFrame(gameLoop);
}

window.startGame = function () {
  const emailInput = document.getElementById("email").value;

  if (!emailInput) {
    alert("Enter email first 😌");
    return;
  }

  userEmail = emailInput;
  obstacles = [];
  score = 0;
  gameRunning = true;

  gameLoop();
};

function endGame() {
  gameRunning = false;
  saveScore();
}

async function saveScore() {
  await addDoc(collection(db, "scores"), {
    email: userEmail,
    score: score
  });

  loadLeaderboard();
}

async function loadLeaderboard() {
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
  const snapshot = await getDocs(q);

  const board = document.getElementById("leaderboard");
  board.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = `${data.email} — ${data.score}`;
    board.appendChild(li);
  });
}

loadLeaderboard();

document.onkeydown = function (e) {
  if (e.key === "ArrowLeft") moveLeft();
  if (e.key === "ArrowRight") moveRight();
};

window.moveLeft = function () {
  if (player.x > 0) player.x -= 20;
};

window.moveRight = function () {
  if (player.x < 280) player.x += 20;
};        let data = doc.data();
        let li = document.createElement("li");
        li.innerText = `${data.email}: ${data.score}`;
        list.appendChild(li);
      });
    });
}
