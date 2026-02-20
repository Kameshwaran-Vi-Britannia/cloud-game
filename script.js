// 🔥 Your Firebase Config Here
const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.appspot.com",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ----------------------------------
// Authentication
// ----------------------------------
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, password)
      .then(() => alert("Account created!"))
      .catch(err => alert(err.message));
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        document.getElementById("auth").style.display = "none";
        document.getElementById("gameArea").style.display = "block";
        loadLeaderboard();
      })
      .catch(err => alert(err.message));
}

// ----------------------------------
// Game Logic
// ----------------------------------
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let player = {x:130, y:350, w:40, h:40};
let obstacles = [];
let score = 0;
let gameInterval, obsInterval;

function startGame() {
  obstacles = [];
  score = 0;
  document.getElementById("scoreDisplay").innerText = score;
  clearInterval(gameInterval);
  clearInterval(obsInterval);

  gameInterval = setInterval(gameLoop, 20);
  obsInterval = setInterval(createObstacle, 1000);
}

function gameLoop() {
  ctx.clearRect(0,0,300,400);

  // draw player
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // obstacles
  obstacles.forEach((obs, index) => {
    obs.y += 2;
    ctx.fillStyle = "red";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

    if (obs.y > 400) {
      obstacles.splice(index,1);
      score++;
      document.getElementById("scoreDisplay").innerText = score;
    }

    if (collision(player, obs)) {
      endGame();
    }
  });
}

function createObstacle() {
  let xPos = Math.random() * 260;
  obstacles.push({x: xPos, y:0, w:40, h:40});
}

function collision(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// move player
document.onkeydown = function(e) {
  if(e.key == "ArrowLeft" && player.x > 0) player.x -= 10;
  if(e.key == "ArrowRight" && player.x < 260) player.x += 10;
}

// ----------------------------------
// End & Save
// ----------------------------------
function endGame() {
  clearInterval(gameInterval);
  clearInterval(obsInterval);
  saveScore();
}

function saveScore() {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("scores").add({
    email: user.email,
    score: score,
    timestamp: Date.now()
  }).then(() => {
    loadLeaderboard();
  });
}

// ----------------------------------
// Leaderboard
// ----------------------------------
function loadLeaderboard() {
  const list = document.getElementById("leaderboard");
  list.innerHTML = "";
  db.collection("scores")
    .orderBy("score", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let data = doc.data();
        let li = document.createElement("li");
        li.innerText = `${data.email}: ${data.score}`;
        list.appendChild(li);
      });
    });
}
