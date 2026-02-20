// 🔥 Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCm6a9GLHaZ_kVdPQtYZFoArFxNprY07cA",
  authDomain: "cloudgame-a1fcd.firebaseapp.com",
  projectId: "cloudgame-a1fcd",
  storageBucket: "cloudgame-a1fcd.firebasestorage.app",
  messagingSenderId: "952588137359",
  appId: "1:952588137359:web:41c9773652bc2d0f34d1fa"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// 🎮 Game State
let score = 0;

// 👤 Sign Up
function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("✅ User Created");
    })
    .catch(err => alert("❌ " + err.message));
}

// 🔐 Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById("login").style.display = "none";
      document.getElementById("game").style.display = "block";
      loadLeaderboard();
    })
    .catch(err => alert("❌ " + err.message));
}

// 🚀 Increase Score
function increaseScore() {
  score++;
  document.getElementById("score").innerText = score;
}

// 💾 Save Score to Firestore
function saveScore() {
  const user = auth.currentUser;

  if (!user) {
    alert("⚠️ Please login first");
    return;
  }

  db.collection("scores").add({
    email: user.email,
    score: score,
    timestamp: Date.now()
  })
  .then(() => {
    alert("🏆 Score Saved!");
    loadLeaderboard();
  })
  .catch(err => alert("❌ " + err.message));
}

// 🏆 Load Leaderboard
function loadLeaderboard() {
  const list = document.getElementById("scoresList");
  list.innerHTML = "";

  db.collection("scores")
    .orderBy("score", "desc")
    .limit(10)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerText = `${data.email}: ${data.score}`;
        list.appendChild(li);
      });
    })
    .catch(err => console.error(err));
}
