/* ======================================================
   HUETRAP — Prototype
   Struktur: Menu -> Cara Bermain / Pemilihan Mode -> Gameplay -> Game Over
   ====================================================== */

// ---------- Elemen layar ----------
const screens = {
  menu: document.getElementById("screen-menu"),
  howto: document.getElementById("screen-howto"),
  mode: document.getElementById("screen-mode"),
  game: document.getElementById("screen-game"),
  over: document.getElementById("screen-over"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ---------- High score (localStorage) ----------
const HIGH_SCORE_KEY = "huetrapHighScore";
function getHighScore() {
  return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10);
}
function setHighScore(v) {
  localStorage.setItem(HIGH_SCORE_KEY, String(v));
}
document.getElementById("menuHighScore").textContent = getHighScore();

// ---------- Navigasi Menu ----------
document.getElementById("btnPlay").onclick = () => showScreen("mode");
document.getElementById("btnHowTo").onclick = () => showScreen("howto");
document.getElementById("btnBackFromHowTo").onclick = () => showScreen("menu");
document.getElementById("btnBackFromMode").onclick = () => showScreen("menu");
document.getElementById("btnHighScore").onclick = () => {
  alert("Rekor tertinggi kamu saat ini: " + getHighScore());
};

document.querySelectorAll(".mode-card").forEach((card) => {
  card.onclick = () => startGame(card.dataset.mode);
});

document.getElementById("btnPlayAgain").onclick = () => startGame(currentMode);
document.getElementById("btnBackToMenu").onclick = () => {
  document.getElementById("menuHighScore").textContent = getHighScore();
  showScreen("menu");
};

/* ======================================================
   GAMEPLAY
   ====================================================== */

const COLORS = [
  { name: "MERAH", hex: "#ff5c5c" },
  { name: "BIRU", hex: "#4d7bff" },
  { name: "KUNING", hex: "#ffd23f" },
  { name: "HIJAU", hex: "#3ddc97" },
  { name: "UNGU", hex: "#a879f0" },
  { name: "ORANYE", hex: "#ff9f4d" },
];

const wordEl = document.getElementById("word");
const optionsEl = document.getElementById("options");
const hudScore = document.getElementById("hudScore");
const hudCombo = document.getElementById("hudCombo");
const hudLives = document.getElementById("hudLives");
const msgEl = document.getElementById("msg");
const timerFill = document.getElementById("timerFill");
const timerLabel = document.getElementById("timerLabel");
const cardEl = document.querySelector("#screen-game .card");

let currentMode = "classic";
let state = {};
let timerInterval = null;

function baseTimeForMode(mode) {
  if (mode === "zen") return 5000;
  return 3000; // classic, survival, timeattack mulai dari 3 detik
}

function resetState(mode) {
  state = {
    mode,
    score: 0,
    combo: 0,
    bestCombo: 0,
    correctStreak: 0,
    lives: mode === "zen" || mode === "timeattack" ? Infinity : mode === "survival" ? 1 : 3,
    level: 1,
    questionTime: baseTimeForMode(mode),
    optionCount: 3,
    sessionTimeLeft: mode === "timeattack" ? 60 : null,
    correctColor: null,
    running: true,
  };
}

function startGame(mode) {
  currentMode = mode;
  showScreen("game");
  resetState(mode);
  updateHud();
  newQuestion();

  if (mode === "timeattack") {
    clearInterval(window._sessionTimer);
    window._sessionTimer = setInterval(() => {
      state.sessionTimeLeft -= 1;
      if (state.sessionTimeLeft <= 0) {
        clearInterval(window._sessionTimer);
        endGame();
      }
    }, 1000);
  }
}

function updateHud() {
  hudScore.textContent = state.score;
  hudCombo.textContent = "Combo: x" + comboMultiplier();
  if (state.mode === "zen") {
    hudLives.textContent = "🌿 Zen";
  } else if (state.mode === "timeattack") {
    hudLives.textContent = "⏱ " + (state.sessionTimeLeft ?? 60) + "s";
  } else {
    const max = state.mode === "survival" ? 1 : 3;
    hudLives.textContent = "❤️".repeat(Math.max(state.lives, 0)) +
      "🖤".repeat(Math.max(max - state.lives, 0));
  }
}

function comboMultiplier() {
  return 1 + Math.floor(state.correctStreak / 5) * 0.5;
}

/* ---------- Naikkan level tiap 5 jawaban benar ---------- */
function maybeLevelUp() {
  if (state.correctStreak > 0 && state.correctStreak % 5 === 0) {
    state.level += 1;
    state.questionTime = Math.max(1200, state.questionTime - 250);
    if (state.level === 6) state.optionCount = 4;
    if (state.level === 11) state.optionCount = 5 <= COLORS.length ? 5 : COLORS.length;
  }
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function newQuestion() {
  msgEl.textContent = "";

  const wordColor = randomChoice(COLORS);
  let inkColor;
  do {
    inkColor = randomChoice(COLORS);
  } while (inkColor.name === wordColor.name);

  state.correctColor = inkColor;

  wordEl.textContent = wordColor.name;
  wordEl.style.color = inkColor.hex;

  // Susun opsi: warna benar + beberapa pengecoh acak
  const pool = COLORS.filter((c) => c.name !== inkColor.name);
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  const distractors = shuffledPool.slice(0, Math.min(state.optionCount - 1, pool.length));
  const optionSet = [...distractors, inkColor].sort(() => Math.random() - 0.5);

  optionsEl.innerHTML = "";
  optionSet.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.style.background = c.hex;
    btn.onclick = () => handleAnswer(c);
    optionsEl.appendChild(btn);
  });

  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerFill.style.width = "100%";
  timerLabel.textContent = "Level " + state.level;

  const duration = state.questionTime;
  const start = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 100 - (elapsed / duration) * 100);
    timerFill.style.width = pct + "%";

    if (elapsed >= duration) {
      clearInterval(timerInterval);
      handleAnswer(null); // waktu habis
    }
  }, 30);
}

function handleAnswer(chosen) {
  clearInterval(timerInterval);

  const isCorrect = chosen && chosen.name === state.correctColor.name;

  if (isCorrect) {
    state.correctStreak += 1;
    const mult = comboMultiplier();
    state.score += Math.round(10 * mult);
    if (mult > state.bestCombo) state.bestCombo = mult;

    msgEl.style.color = "var(--correct)";
    msgEl.textContent = "Benar! 🎉";
    maybeLevelUp();
    updateHud();
    setTimeout(() => {
      if (state.running) newQuestion();
    }, 400);
  } else {
    state.correctStreak = 0;

    msgEl.style.color = "var(--wrong)";
    msgEl.textContent = chosen ? "Salah!" : "Waktu habis!";
    cardEl.classList.add("shake");
    setTimeout(() => cardEl.classList.remove("shake"), 300);

    if (state.mode === "zen") {
      updateHud();
      setTimeout(() => {
        if (state.running) newQuestion();
      }, 500);
      return;
    }

    if (state.mode === "survival") {
      updateHud();
      setTimeout(endGame, 500);
      return;
    }

    // classic & timeattack: kurangi nyawa (timeattack punya lives Infinity, jadi tidak habis)
    state.lives -= 1;
    updateHud();

    if (state.mode === "classic" && state.lives <= 0) {
      setTimeout(endGame, 500);
    } else {
      setTimeout(() => {
        if (state.running) newQuestion();
      }, 500);
    }
  }
}

/* ---------- Game Over ---------- */
function endGame() {
  state.running = false;
  clearInterval(timerInterval);
  clearInterval(window._sessionTimer);

  const prevHigh = getHighScore();
  const isNewRecord = state.score > prevHigh;
  if (isNewRecord) setHighScore(state.score);

  document.getElementById("overScore").textContent = state.score;
  document.getElementById("overCombo").textContent = "x" + state.bestCombo;
  document.getElementById("overNewRecord").style.visibility = isNewRecord ? "visible" : "hidden";
  document.getElementById("overTitle").textContent =
    state.mode === "timeattack" ? "Waktu Habis!" : "Game Over";

  showScreen("over");
}