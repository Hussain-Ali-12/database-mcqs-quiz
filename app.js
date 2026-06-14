const STORAGE_KEY = "db_mcq_trainer_state_v1";
const THEME_KEY = "db_mcq_trainer_theme_v1";
const NEXT_DELAY_MS = 650;

const els = {
  progressStat: document.getElementById("progressStat"),
  accuracyStat: document.getElementById("accuracyStat"),
  attemptStat: document.getElementById("attemptStat"),
  wrongStat: document.getElementById("wrongStat"),
  streakStat: document.getElementById("streakStat"),
  timerStat: document.getElementById("timerStat"),
  progressBar: document.getElementById("progressBar"),
  quizCard: document.getElementById("quizCard"),
  finishCard: document.getElementById("finishCard"),
  questionBadge: document.getElementById("questionBadge"),
  sourceBadge: document.getElementById("sourceBadge"),
  bestStreakBadge: document.getElementById("bestStreakBadge"),
  questionText: document.getElementById("questionText"),
  optionsList: document.getElementById("optionsList"),
  feedback: document.getElementById("feedback"),
  restartBtn: document.getElementById("restartBtn"),
  retryWrongBtn: document.getElementById("retryWrongBtn"),
  exportBtn: document.getElementById("exportBtn"),
  themeToggle: document.getElementById("themeToggle"),
  resetAllTop: document.getElementById("resetAllTop"),
  finalQuestions: document.getElementById("finalQuestions"),
  finalAccuracy: document.getElementById("finalAccuracy"),
  finalAttempts: document.getElementById("finalAttempts"),
  finalWrong: document.getElementById("finalWrong"),
  finalBestStreak: document.getElementById("finalBestStreak"),
  finalTime: document.getElementById("finalTime"),
  restartFinalBtn: document.getElementById("restartFinalBtn"),
  retryWrongFinalBtn: document.getElementById("retryWrongFinalBtn"),
  resetAllFinalBtn: document.getElementById("resetAllFinalBtn"),
  mistakeReview: document.getElementById("mistakeReview")
};

let state = null;
let timerInterval = null;
let nextTimeout = null;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function buildSession(sourceQuestions = window.QUESTION_BANK, mode = "all") {
  const sessionQuestions = shuffle(sourceQuestions).map((q) => ({
    id: q.id,
    question: q.question,
    originalAnswer: q.answer,
    options: shuffle(q.options.map((opt) => ({ ...opt }))),
    wrongOptionTexts: [],
    solved: false,
    attempts: 0,
    wrongClicks: 0
  }));

  return {
    version: 1,
    mode,
    currentIndex: 0,
    sessionQuestions,
    correctQuestions: 0,
    totalAttempts: 0,
    wrongClicks: 0,
    streak: 0,
    bestStreak: 0,
    questionResults: {},
    startedAt: nowSeconds(),
    elapsedBeforePause: 0,
    completedAt: null
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save progress:", err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.sessionQuestions) || parsed.sessionQuestions.length === 0) return null;
    return parsed;
  } catch (err) {
    console.warn("Could not load saved progress:", err);
    return null;
  }
}

function clearPendingNext() {
  if (nextTimeout) {
    clearTimeout(nextTimeout);
    nextTimeout = null;
  }
}

function currentElapsedSeconds() {
  if (!state) return 0;
  const base = state.elapsedBeforePause || 0;
  if (state.completedAt) {
    return base + Math.max(0, state.completedAt - state.startedAt);
  }
  return base + Math.max(0, nowSeconds() - state.startedAt);
}

function updateTimer() {
  els.timerStat.textContent = formatTime(currentElapsedSeconds());
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function accuracy() {
  if (!state || state.totalAttempts === 0) return 100;
  return Math.round((state.correctQuestions / state.totalAttempts) * 100);
}

function hasMistakes() {
  return Object.values(state.questionResults || {}).some((r) => r.wrongClicks > 0);
}

function updateStats() {
  const total = state.sessionQuestions.length;
  const done = state.correctQuestions;
  els.progressStat.textContent = `${done} / ${total}`;
  els.accuracyStat.textContent = `${accuracy()}%`;
  els.attemptStat.textContent = String(state.totalAttempts);
  els.wrongStat.textContent = String(state.wrongClicks);
  els.streakStat.textContent = String(state.streak);
  els.bestStreakBadge.textContent = `Best streak: ${state.bestStreak}`;
  els.progressBar.style.width = `${total ? (done / total) * 100 : 0}%`;
  els.retryWrongBtn.disabled = !hasMistakes();
  updateTimer();
}

function renderQuestion() {
  clearPendingNext();
  updateStats();

  if (state.currentIndex >= state.sessionQuestions.length) {
    renderFinish();
    return;
  }

  els.finishCard.classList.add("hidden");
  els.quizCard.classList.remove("hidden");

  const q = state.sessionQuestions[state.currentIndex];
  els.questionBadge.textContent = `Question ${state.currentIndex + 1} of ${state.sessionQuestions.length}`;
  els.sourceBadge.textContent = `Original #${q.id}`;
  els.questionText.textContent = q.question;
  els.feedback.textContent = "Choose an option. Wrong choices will be crossed out until you find the correct one.";
  els.feedback.className = "feedback neutral";

  els.optionsList.innerHTML = "";
  q.options.forEach((opt, displayIndex) => {
    const key = String.fromCharCode(65 + displayIndex);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.dataset.optionText = opt.text;
    btn.dataset.correct = String(opt.correct);
    btn.dataset.key = key;
    btn.innerHTML = `
      <span class="option-key">${key}</span>
      <span class="option-text">${escapeHtml(opt.text)}</span>
    `;

    if (q.wrongOptionTexts.includes(opt.text)) {
      btn.classList.add("wrong");
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    }

    btn.addEventListener("click", () => handleOptionClick(btn, opt));
    els.optionsList.appendChild(btn);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function handleOptionClick(btn, opt) {
  if (!state || btn.disabled) return;

  const q = state.sessionQuestions[state.currentIndex];
  q.attempts += 1;
  state.totalAttempts += 1;

  if (opt.correct) {
    q.solved = true;
    state.correctQuestions += 1;
    state.streak = q.wrongClicks === 0 ? state.streak + 1 : 0;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    state.questionResults[q.id] = {
      id: q.id,
      question: q.question,
      correctAnswer: opt.text,
      attempts: q.attempts,
      wrongClicks: q.wrongClicks,
      wrongOptions: [...q.wrongOptionTexts]
    };

    btn.classList.add("correct");
    [...els.optionsList.querySelectorAll(".option-btn")].forEach((b) => (b.disabled = true));

    els.feedback.textContent = q.wrongClicks === 0
      ? "Correct. Clean answer — moving to the next question."
      : "Correct after retry. Moving to the next question.";
    els.feedback.className = "feedback good";

    updateStats();
    saveState();

    nextTimeout = setTimeout(() => {
      state.currentIndex += 1;
      saveState();
      renderQuestion();
    }, NEXT_DELAY_MS);
    return;
  }

  if (!q.wrongOptionTexts.includes(opt.text)) {
    q.wrongOptionTexts.push(opt.text);
    q.wrongClicks += 1;
    state.wrongClicks += 1;
    state.streak = 0;
  }

  btn.classList.add("wrong");
  btn.disabled = true;
  btn.setAttribute("aria-disabled", "true");

  els.feedback.textContent = "Wrong option crossed out. Try another option until you get it right.";
  els.feedback.className = "feedback bad";

  updateStats();
  saveState();
}

function renderFinish() {
  clearPendingNext();

  if (!state.completedAt) {
    state.completedAt = nowSeconds();
    saveState();
  }

  els.quizCard.classList.add("hidden");
  els.finishCard.classList.remove("hidden");

  els.finalQuestions.textContent = String(state.sessionQuestions.length);
  els.finalAccuracy.textContent = `${accuracy()}%`;
  els.finalAttempts.textContent = String(state.totalAttempts);
  els.finalWrong.textContent = String(state.wrongClicks);
  els.finalBestStreak.textContent = String(state.bestStreak);
  els.finalTime.textContent = formatTime(currentElapsedSeconds());

  const mistakeItems = Object.values(state.questionResults || {}).filter((r) => r.wrongClicks > 0);
  els.retryWrongFinalBtn.disabled = mistakeItems.length === 0;

  if (mistakeItems.length === 0) {
    els.mistakeReview.innerHTML = `<p>No mistakes in this session. Perfect clean run.</p>`;
  } else {
    els.mistakeReview.innerHTML = mistakeItems
      .sort((a, b) => a.id - b.id)
      .map((r) => `
        <article class="review-item">
          <strong>Original #${r.id}: ${escapeHtml(r.question)}</strong>
          <p><b>Correct:</b> ${escapeHtml(r.correctAnswer)}</p>
          <p><b>Wrong clicked:</b> ${r.wrongOptions.map(escapeHtml).join(", ")}</p>
          <p><b>Attempts:</b> ${r.attempts}</p>
        </article>
      `)
      .join("");
  }

  updateStats();
}

function startFresh() {
  clearPendingNext();
  state = buildSession(window.QUESTION_BANK, "all");
  saveState();
  startTimer();
  renderQuestion();
}

function retryWrongOnly() {
  const mistakeIds = new Set(
    Object.values(state.questionResults || {})
      .filter((r) => r.wrongClicks > 0)
      .map((r) => Number(r.id))
  );

  if (mistakeIds.size === 0) return;

  const wrongQuestions = window.QUESTION_BANK.filter((q) => mistakeIds.has(Number(q.id)));
  clearPendingNext();
  state = buildSession(wrongQuestions, "wrong-only");
  saveState();
  startTimer();
  renderQuestion();
}

function resetEverything() {
  if (!confirm("Reset quiz progress, metrics, and current shuffle?")) return;
  localStorage.removeItem(STORAGE_KEY);
  startFresh();
}

function exportResults() {
  if (!state) return;

  const rows = [
    ["metric", "value"],
    ["mode", state.mode],
    ["questions", state.sessionQuestions.length],
    ["completed", state.correctQuestions],
    ["accuracy_percent", accuracy()],
    ["total_attempts", state.totalAttempts],
    ["wrong_clicks", state.wrongClicks],
    ["best_streak", state.bestStreak],
    ["time", formatTime(currentElapsedSeconds())],
    [],
    ["original_question_number", "question", "correct_answer", "attempts", "wrong_clicks", "wrong_options"]
  ];

  Object.values(state.questionResults || {})
    .sort((a, b) => a.id - b.id)
    .forEach((r) => {
      rows.push([
        r.id,
        r.question,
        r.correctAnswer,
        r.attempts,
        r.wrongClicks,
        (r.wrongOptions || []).join(" | ")
      ]);
    });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `db-mcq-results-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  els.themeToggle.textContent = theme === "dark" ? "☀️ Theme" : "🌙 Theme";
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);
}

function initEvents() {
  els.restartBtn.addEventListener("click", startFresh);
  els.restartFinalBtn.addEventListener("click", startFresh);
  els.retryWrongBtn.addEventListener("click", retryWrongOnly);
  els.retryWrongFinalBtn.addEventListener("click", retryWrongOnly);
  els.resetAllTop.addEventListener("click", resetEverything);
  els.resetAllFinalBtn.addEventListener("click", resetEverything);
  els.exportBtn.addEventListener("click", exportResults);

  els.themeToggle.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toUpperCase();
    if (!["A", "B", "C", "D"].includes(key)) return;
    if (els.quizCard.classList.contains("hidden")) return;
    const target = els.optionsList.querySelector(`.option-btn[data-key="${key}"]:not(:disabled)`);
    if (target) target.click();
  });

  window.addEventListener("beforeunload", saveState);
}

function init() {
  if (!Array.isArray(window.QUESTION_BANK) || window.QUESTION_BANK.length === 0) {
    els.questionText.textContent = "Question bank not found.";
    els.feedback.textContent = "Check that questions.js is present beside index.html.";
    els.feedback.className = "feedback bad";
    return;
  }

  initTheme();
  initEvents();

  state = loadState() || buildSession(window.QUESTION_BANK, "all");
  startTimer();

  if (state.currentIndex >= state.sessionQuestions.length) {
    renderFinish();
  } else {
    renderQuestion();
  }
}

init();
