const $ = id => document.getElementById(id);

const DOM = {
  // Tabs
  tabStandard:      $('tab-standard'),
  tabGame:          $('tab-game'),
  tabCode:          $('tab-code'),
  tabAnalytics:     $('tab-analytics'),
  // Pages
  pageStandard:     $('page-standard'),
  pageGame:         $('page-game'),
  pageCode:         $('page-code'),
  pageAnalytics:    $('page-analytics'),

  // Standard mode
  timerDisplay:     $('timer-display'),
  liveWpm:          $('live-wpm'),
  liveAcc:          $('live-acc'),
  liveErrors:       $('live-errors'),
  typingDisplay:    $('typing-display'),
  typingInner:      $('typing-inner'),
  typingInput:      $('typing-input'),
  capsLockWarn:     $('caps-lock-warn'),
  btnRestart:       $('btn-restart'),
  timerOptions:     document.querySelectorAll('.timer-option'),
  progressFill:     $('progress-fill'),

  // Code mode
  codeDisplay:      $('code-display'),
  codeInput:        $('code-input'),
  codeLabel:        $('code-label'),
  codeTimerDisp:    $('code-timer-disp'),
  codeLiveWpm:      $('code-live-wpm'),
  codeLiveAcc:      $('code-live-acc'),
  btnCodeRestart:   $('btn-code-restart'),

  // Game mode
  gameScore:        $('game-score'),
  gameMissed:       $('game-missed'),
  gameWpm:          $('game-wpm'),
  livesDisplay:     $('lives-display'),
  gameArena:        $('game-arena'),
  gameInput:        $('game-input'),
  btnGameStart:     $('btn-game-start'),
  btnGameStop:      $('btn-game-stop'),

  // Analytics mode
  statsWpm:         $('stats-avg-wpm'),
  statsAcc:         $('stats-avg-acc'),
  statsTotal:       $('stats-sessions'),
  statsBest:        $('stats-best-wpm'),
  historyTbody:     $('history-body'),
  analyticsFilter:  $('mode-filter'),

  // Sound
  soundToggle:      $('sound-toggle'),

  // Results
  resultsOverlay:   $('results-overlay'),
  resWpm:           $('res-wpm'),
  resRawWpm:        $('res-raw-wpm'),
  resAcc:           $('res-accuracy'),
  resConsistency:   $('res-consistency'),
  resErrors:        $('res-errors'),
  resDuration:      $('res-duration'),
  resMode:          $('res-mode'),
  btnResRestart:    $('btn-res-restart'),
  btnResAnalytics:  $('btn-res-analytics'),
};

const State = {
  mode: 'standard', // standard | game | code | analytics
  theme: 'dark',

  typing: {
    snippet: null,
    input: '',
    started: false,
    finished: false,
    startTime: null,
    active: false,
    errors: 0,
    totalCharsTyped: 0,
    totalCorrect: 0,
    totalKeystrokes: 0,
    cumulativeCorrect: 0,
    curKeystrokes: 0,
    wpmHistory: [],
    consistencyTimer: null,
  },

  code: {
    snippet: null,
    input: '',
    errors: 0,
    started: false,
    finished: false,
    startTime: null,
    active: false,
    totalKeystrokes: 0,
  },

  game: {
    words: [],
    score: 0,
    missed: 0,
    lives: 3,
    wpmTrack: 0,
    interval: null,
    spawnTimer: null,
    spawnDelay: 2500,
    fallDur: 10000,
  },
};

/* ── Utilities ───────────────────────────────────── */
function countCorrectChars(inputStr, targetStr) {
  let correct = 0;
  for(let i=0; i<inputStr.length; i++) {
    if(inputStr[i] === targetStr[i]) correct++;
  }
  return correct;
}

function calcNetWpm(correctChars, elapsedMs) {
  if (elapsedMs <= 0) return 0;
  return Math.round((correctChars / 5) / (elapsedMs / 60000));
}

function calcRawWpm(totalKeystrokes, elapsedMs) {
  if (elapsedMs <= 0) return 0;
  return Math.round((totalKeystrokes / 5) / (elapsedMs / 60000));
}

function calcAccuracyMT(correctChars, totalKeystrokes) {
  if (totalKeystrokes <= 0) return 100;
  return Math.max(0, Math.round((correctChars / totalKeystrokes) * 100));
}

function calcConsistency(history) {
  if (history.length < 2) return 100;
  let changes = 0;
  for (let i = 1; i < history.length; i++) {
     const diff = Math.abs(history[i] - history[i-1]);
     const max = Math.max(history[i], history[i-1]) || 1;
     changes += (diff / max);
  }
  const avgVar = changes / (history.length - 1);
  return Math.max(0, Math.round(100 - (avgVar * 100)));
}

async function postResults(wpm, acc, mode, duration, rawWpm, consistency) {
  try {
    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wpm, accuracy: acc, mode, duration, raw_wpm: rawWpm, consistency })
    });
  } catch(e) { console.error('Failed to post results', e); }
}

/* ── Tabs ────────────────────────────────────────── */
function switchTab(mode) {
  State.mode = mode;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  $(`tab-${mode}`).classList.add('active');
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`page-${mode}`).classList.add('active');

  if (mode === 'standard') {
    if (!State.typing.snippet) loadStandardContent();
    DOM.typingInput.focus();
    DOM.typingDisplay.classList.add('focused');
  } else if (mode === 'code') {
    if (!State.code.snippet) loadCodeContent();
    DOM.codeDisplay.focus();
    DOM.codeDisplay.classList.add('focused');
  } else if (mode === 'game') {
    DOM.gameInput.focus();
  } else if (mode === 'analytics') {
    loadAnalytics();
  }
}

DOM.tabStandard.addEventListener('click', () => switchTab('standard'));
DOM.tabGame.addEventListener('click', () => switchTab('game'));
DOM.tabCode.addEventListener('click', () => switchTab('code'));
DOM.tabAnalytics.addEventListener('click', () => switchTab('analytics'));

/* ── Standard Mode ───────────────────────────────── */
let timerDur = 60;
let timerInterval = null;

function resetTimerOpts() {
  DOM.timerOptions.forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.secs) === timerDur) btn.classList.add('active');
  });
}

DOM.timerOptions.forEach(btn => {
  btn.addEventListener('click', (e) => {
    timerDur = parseInt(e.target.dataset.secs);
    resetTimerOpts();
    resetTypingState(); 
  });
});

async function loadStandardContent() {
  const res = await fetch('/api/content/standard');
  const data = await res.json();
  State.typing.snippet = data.text;
  resetTypingState();
}

function resetTypingState() {
  if (timerInterval) clearInterval(timerInterval);
  if (State.typing.consistencyTimer) clearInterval(State.typing.consistencyTimer);
  State.typing.input = '';
  State.typing.started = false;
  State.typing.finished = false;
  State.typing.active = false;
  State.typing.errors = 0;
  State.typing.totalCharsTyped = 0;
  State.typing.totalCorrect = 0;
  State.typing.totalKeystrokes = 0;
  State.typing.cumulativeCorrect = 0;
  State.typing.curKeystrokes = 0;
  State.typing.wpmHistory = [];
  
  DOM.timerDisplay.textContent = timerDur;
  DOM.timerDisplay.classList.remove('warning');
  DOM.progressFill.style.width = '100%';
  DOM.typingInput.value = '';
  DOM.typingInput.disabled = false;
  
  DOM.typingInner.style.transform = '';
  renderTypingDisplay();
  DOM.typingDisplay.classList.add('focused');
  updateLiveStats(0, 100, 0);
  DOM.typingInput.focus();
}

function updateLiveStats(wpm, acc, err) {
  DOM.liveWpm.textContent = wpm;
  DOM.liveAcc.textContent = acc + '%';
  DOM.liveErrors.textContent = err;
}

function renderTypingDisplay() {
  if (!State.typing.snippet) return;
  const text = State.typing.snippet;
  const input = State.typing.input;
  let html = '';
  
  for (let i = 0; i < text.length; i++) {
    const raw = text[i];
    let display = raw;
    if (raw === ' ') display = '\u00a0';
    let cls = '';
    if (i < input.length) cls = input[i] === raw ? 'correct' : 'wrong';
    else if (i === input.length && State.typing.active) cls = 'cursor';
    html += `<span class="char ${cls}">${display}</span>`;
  }
  
  DOM.typingInner.innerHTML = html;
  
  const cursor = DOM.typingInner.querySelector('.cursor');
  if (cursor) {
    const parentTop = DOM.typingDisplay.getBoundingClientRect().top;
    const cursorTop = cursor.getBoundingClientRect().top;
    const diff = cursorTop - parentTop;
    if (diff > 80) {
       DOM.typingInner.style.transform = `translateY(-${diff - 40}px)`;
    }
  }
}

DOM.typingInput.addEventListener('input', e => {
  if (State.typing.finished || !State.typing.snippet) return;
  
  if (!State.typing.started) {
    activateStandardTyping();
    State.typing.started = true;
    State.typing.startTime = Date.now();
    startStandardTimer();
    startConsistencyTimer();
  }
  
  const val = DOM.typingInput.value;
  const oldVal = State.typing.input;
  State.typing.input = val;

  // Detect deletion vs insertion
  const isDeletion = val.length < oldVal.length;
  
  const code = State.typing.snippet;

  // Track total keystrokes (only for insertions)
  if (!isDeletion) {
      State.typing.totalKeystrokes++;
      const addedChars = val.slice(oldVal.length);
      for (let i = 0; i < addedChars.length; i++) {
         const codeIdx = oldVal.length + i;
         if (codeIdx < code.length && val[codeIdx] !== code[codeIdx]) {
             State.typing.errors++;
         }
      }
  }

  let currentErrors = 0;
  for (let i=0; i<val.length; i++) {
    if (val[i] !== code[i]) currentErrors++;
  }
  
  const elapsed = Date.now() - State.typing.startTime;
  
  // Strict WPM: Only count characters belonging to fully correct words
  const wordsTarget = code.split(' ');
  const wordsTyped  = val.split(' ');
  let strictCorrectChars = State.typing.cumulativeCorrect;
  
  // Calculate correct chars for the current sentence (full words only)
  for (let i = 0; i < wordsTyped.length - 1; i++) {
     if (wordsTyped[i] === wordsTarget[i]) {
         strictCorrectChars += wordsTyped[i].length + 1; // +1 for the space
     }
  }
  // For the current (unfinished) word, we count chars only if they match so far
  const lastIdx = wordsTyped.length - 1;
  const currentWordInput  = wordsTyped[lastIdx];
  const currentWordTarget = wordsTarget[lastIdx];
  if (currentWordTarget && currentWordTarget.startsWith(currentWordInput)) {
      strictCorrectChars += currentWordInput.length;
  }
  
  const netWpm = calcNetWpm(strictCorrectChars, elapsed);
  // Accuracy: Correct Chars / Total Keystrokes (Every error reduces it)
  // We use currentCorrectChars (char-by-char) for accuracy denominator logic
  const actualCorrectChars = countCorrectChars(val, code) + (State.typing.cumulativeCorrect || 0);
  const acc = calcAccuracyMT(actualCorrectChars, State.typing.totalKeystrokes || 1);
  
  updateLiveStats(netWpm, acc, currentErrors);
  
  renderTypingDisplay();
  
  if (val.length >= code.length) {
    // Only add characters from fully correct sentences to cumulative
    // (We treat the whole sentence as a block completion here)
    if (val === code) {
        State.typing.cumulativeCorrect += code.length + 1;
        State.typing.input = "";
        DOM.typingInput.value = "";
        loadStandardNextSnippet();
    }
  }
});

async function loadStandardNextSnippet() {
  const res = await fetch('/api/content/standard');
  const data = await res.json();
  State.typing.snippet = data.text;
  DOM.typingInner.style.transform = '';
  renderTypingDisplay();
}

function startStandardTimer() {
  const endTime = Date.now() + timerDur * 1000;
  timerInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    DOM.timerDisplay.textContent = remaining;
    DOM.progressFill.style.width = `${(remaining / timerDur) * 100}%`;
    if (remaining <= 5) DOM.timerDisplay.classList.add('warning');
    if (remaining <= 0) finishStandardSession();
  }, 1000);
}

function startConsistencyTimer() {
  State.typing.consistencyTimer = setInterval(() => {
     const elapsed = Date.now() - State.typing.startTime;
     const correct = countCorrectChars(State.typing.input, State.typing.snippet);
     State.typing.wpmHistory.push(calcNetWpm(correct, elapsed));
  }, 1000);
}

async function activateStandardTyping() {
  if (State.typing.finished) return;
  State.typing.active = true;
  DOM.typingDisplay.classList.add('focused');
  DOM.typingInput.focus();
}

async function finishStandardSession() {
  if (State.typing.finished) return;
  State.typing.finished = true;
  clearInterval(timerInterval);
  clearInterval(State.typing.consistencyTimer);
  DOM.typingInput.disabled = true;
  DOM.typingDisplay.classList.remove('focused');
  
  const elapsed = Date.now() - State.typing.startTime;
  const code = State.typing.snippet;
  const val  = State.typing.input;
  
  // Final Strict WPM calc
  const wordsTarget = code.split(' ');
  const wordsTyped  = val.split(' ');
  let finalCorrectChars = State.typing.cumulativeCorrect;
  for (let i = 0; i < wordsTyped.length; i++) {
     if (wordsTyped[i] === wordsTarget[i]) {
         finalCorrectChars += wordsTyped[i].length + (i < wordsTarget.length - 1 ? 1 : 0);
     }
  }

  const netWpm = calcNetWpm(finalCorrectChars, elapsed);
  const rawWpm = calcRawWpm(State.typing.totalKeystrokes, elapsed);
  const actualCorrectChars = countCorrectChars(val, code) + (State.typing.cumulativeCorrect || 0);
  const acc = calcAccuracyMT(actualCorrectChars, State.typing.totalKeystrokes || 1);
  const dur = timerDur - parseInt(DOM.timerDisplay.textContent);
  const cons = calcConsistency(State.typing.wpmHistory);
  
  await postResults(netWpm, acc, 'standard', dur > 0 ? dur : timerDur, rawWpm, cons);
  showResults(netWpm, acc, State.typing.errors, dur > 0 ? dur : timerDur, 'standard', rawWpm, cons);
}

DOM.btnRestart.addEventListener('click', loadStandardContent);

/* ── Code Mode ───────────────────────────────────── */
async function loadCodeContent() {
  const res = await fetch('/api/content/code');
  const data = await res.json();
  State.code.snippet = data;
  resetCodeState();
}

function resetCodeState() {
  State.code.input = '';
  State.code.errors = 0;
  State.code.started = false;
  State.code.finished = false;
  State.code.active = true;
  State.code.totalKeystrokes = 0;
  window.lastCodeInput = '';

  if (State.code.snippet) {
    DOM.codeLabel.textContent = `python · ${State.code.snippet.label}`;
  }
  DOM.codeTimerDisp.textContent   = '0s';
  DOM.codeLiveWpm.textContent     = '0';
  DOM.codeLiveAcc.textContent     = '100%';

  renderCodeDisplay();
  DOM.codeDisplay.classList.add('focused');
}

function renderCodeDisplay() {
  if (!State.code.snippet) return;
  const text  = State.code.snippet.code;
  const input = State.code.input;
  let html = '';

  for (let i = 0; i < text.length; i++) {
    const raw = text[i];
    let display;
    if      (raw === '\n') display = '\n';
    else if (raw === ' ')  display = '\u00a0';
    else                   display = raw.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));

    let cls = '';
    if      (i < input.length)  cls = input[i] === raw ? 'correct' : 'wrong';
    else if (i === input.length && State.code.active) cls = 'cursor';

    html += `<span class="char ${cls}">${display}</span>`;
  }

  DOM.codeDisplay.innerHTML = html;
  const cursorEl = DOM.codeDisplay.querySelector('.cursor');
  if (cursorEl) cursorEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleCodeInput() {
  if (State.code.finished || !State.code.snippet) return;

  if (!State.code.started) {
    State.code.started   = true;
    State.code.startTime = Date.now();
  }

  const val  = State.code.input;
  const code = State.code.snippet.code;

  if (window.lastCodeInput !== undefined && val.length > window.lastCodeInput.length) {
      const addedChars = val.slice(window.lastCodeInput.length);
      for(let i=0; i<addedChars.length; i++) {
         const idx = window.lastCodeInput.length + i;
         if (idx < code.length && val[idx] !== code[idx]) {
             State.code.errors++;
         }
      }
  }
  window.lastCodeInput = val;

  const elapsed      = (Date.now() - State.code.startTime);
  const correctChars = countCorrectChars(val, code);
  const netWpm       = calcNetWpm(correctChars, elapsed);
  const rawWpm       = calcRawWpm(State.code.totalKeystrokes, elapsed);
  const acc          = calcAccuracyMT(correctChars, State.code.totalKeystrokes || 1);

  DOM.codeLiveWpm.textContent   = netWpm;
  DOM.codeLiveAcc.textContent   = `${acc}%`;
  DOM.codeTimerDisp.textContent = `${Math.round(elapsed/1000)}s`;

  renderCodeDisplay();

  if (val.length >= code.length) finishCodeSession();
}

function activateCodeTyping() {
  State.code.active = true;
  DOM.codeDisplay.classList.add('focused');
  DOM.codeDisplay.focus(); 
}

async function finishCodeSession() {
  if (State.code.finished) return;
  State.code.finished = true;
  DOM.codeDisplay.classList.remove('focused');

  const elapsed      = Date.now() - State.code.startTime;
  const val          = State.code.input;
  const code         = State.code.snippet.code;
  const correctChars = countCorrectChars(val, code);
  const netWpm       = calcNetWpm(correctChars, elapsed);
  const rawWpm       = calcRawWpm(State.code.totalKeystrokes, elapsed);
  const acc          = calcAccuracyMT(correctChars, State.code.totalKeystrokes || 1);
  const dur          = Math.round(elapsed / 1000);

  await postResults(netWpm, acc, 'code', dur, rawWpm, 100);
  showResults(netWpm, acc, State.code.errors, dur, 'code', rawWpm, 100);
}

DOM.btnCodeRestart.addEventListener('click', loadCodeContent);

DOM.codeDisplay.addEventListener('keydown', e => {
  if (!State.code.active || State.code.finished || !State.code.snippet) return;
  const text        = State.code.snippet.code;
  const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

  if (e.key === 'Tab') {
    e.preventDefault();
    const pos = State.code.input.length;
    let spaces = 0, p = pos;
    while (p < text.length && text[p] === ' ' && spaces < 4) { spaces++; p++; }
    State.code.input           += ' '.repeat(spaces || 1);
    State.code.totalKeystrokes += spaces || 1;
    handleCodeInput();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    State.code.input           += '\n';
    State.code.totalKeystrokes++;
    handleCodeInput();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    if (State.code.input.length > 0) {
      State.code.input = State.code.input.slice(0, -1);
      handleCodeInput();
    }
  } else if (isPrintable) {
    e.preventDefault();
    State.code.input           += e.key;
    State.code.totalKeystrokes++;
    handleCodeInput();
  }
});

DOM.codeDisplay.addEventListener('click', () => {
    State.code.active = true;
    DOM.codeDisplay.focus();
    renderCodeDisplay();
});
DOM.typingDisplay.addEventListener('click', () => {
    State.typing.active = true;
    DOM.typingInput.focus();
    renderTypingDisplay();
});

/* ── Audio Engine & Key Catcher ──────────────────── */
const AudioEngine = {
  ctx: null,
  mode: 'none', // none, thock, clicky
  unlocked: false,

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
  },

  async play(keyType = 'normal') {
    if (this.mode === 'none') return;
    await this.init();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (this.mode === 'clicky') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(keyType === 'space' ? 400 : 600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.start(t);
      osc.stop(t + 0.05);
    } else if (this.mode === 'thock') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(keyType === 'space' ? 100 : 140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
};

// Unlock AudioContext on first user gesture (required by browsers)
document.addEventListener('click', () => AudioEngine.init(), { once: true });
document.addEventListener('keydown', () => AudioEngine.init(), { once: true });

DOM.soundToggle.addEventListener('change', async (e) => {
  AudioEngine.mode = e.target.value;
  await AudioEngine.init();
  if (e.target.value !== 'none') AudioEngine.play('normal'); // Preview
});

document.addEventListener('keydown', e => {
  // Play sound if printable or functional key
  if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
     AudioEngine.play(e.key === ' ' ? 'space' : 'normal');
  }

  if (DOM.capsLockWarn) {
    DOM.capsLockWarn.classList.toggle('show', e.getModifierState('CapsLock'));
  }
  const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

  if (State.mode === 'standard') {
    if (!State.typing.started && !State.typing.finished && isPrintable) {
       activateStandardTyping();
    }
    if (e.key === 'Tab') { e.preventDefault(); loadStandardContent(); }
  }
  
  if (State.mode === 'code' && State.code.snippet && !State.code.finished) {
    if (isPrintable && document.activeElement !== DOM.codeDisplay) {
      activateCodeTyping();
      State.code.input += e.key;
      State.code.totalKeystrokes++;
      handleCodeInput();
    }
  }
});

/* ── Game Mode ───────────────────────────────────── */
let gameWordPool    = [];
let gameActiveWords = [];
let gameAnimFrame;
let gameWordIndex   = 0;

async function loadGameWords() {
  const res  = await fetch('/api/content/game-words?count=50');
  const data = await res.json();
  gameWordPool = [...data.words];
  shuffleArray(gameWordPool);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function resetGameState() {
  State.game.words      = [];
  State.game.score      = 0;
  State.game.missed     = 0;
  State.game.lives      = 3;
  State.game.wpmTrack   = 0;
  State.game.spawnDelay = 2500;
  State.game.fallDur    = 10000;
  gameActiveWords       = [];
  gameWordIndex         = 0;
  if (State.game.spawnTimer) clearTimeout(State.game.spawnTimer);
  cancelAnimationFrame(gameAnimFrame);
  DOM.gameArena.querySelectorAll('.game-word').forEach(el => el.remove());
  DOM.gameScore.textContent  = '0';
  DOM.gameMissed.textContent = '0';
  DOM.gameWpm.textContent    = '0';
  renderLives();
}

function renderLives() {
  DOM.livesDisplay.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const pip = document.createElement('div');
    pip.className = 'life-pip' + (i >= State.game.lives ? ' dead' : '');
    DOM.livesDisplay.appendChild(pip);
  }
}

function spawnGameWord() {
  if (gameWordPool.length === 0) return;
  const word = gameWordPool[gameWordIndex % gameWordPool.length];
  gameWordIndex++;
  if (gameWordIndex >= gameWordPool.length) {
    gameWordIndex = 0;
    shuffleArray(gameWordPool);
  }

  const arena = DOM.gameArena;
  const aW    = arena.clientWidth;
  const left  = Math.max(20, Math.floor(Math.random() * (aW - word.length * 11 - 40)));

  const el = document.createElement('div');
  el.className   = 'game-word';
  el.textContent = word;
  el.style.left  = left + 'px';
  arena.appendChild(el);

  const entry = { el, word, startTime: Date.now(), duration: State.game.fallDur };
  gameActiveWords.push(entry);
  highlightTarget();
}

function highlightTarget() {
  const typed = DOM.gameInput.value.trim();
  gameActiveWords.forEach(w => {
    if (typed.length > 0 && w.word.startsWith(typed)) {
        w.el.classList.add('highlight');
    } else {
        w.el.classList.remove('highlight');
    }
  });
}

function gameLoop() {
  const now   = Date.now();
  const arena = DOM.gameArena;
  const aH    = arena.clientHeight;

  const expired = [];
  gameActiveWords.forEach(entry => {
    const elapsed  = now - entry.startTime;
    const progress = elapsed / entry.duration;
    const top      = (progress * (aH + 48)) - 48;
    entry.el.style.top = top + 'px';

    if (progress >= 1) expired.push(entry);
  });

  expired.forEach(entry => {
    entry.el.remove();
    gameActiveWords = gameActiveWords.filter(w => w !== entry);
    State.game.missed++;
    State.game.lives--;
    DOM.gameMissed.textContent = State.game.missed;
    renderLives();

    if (State.game.lives <= 0) { gameOver(); return; }
  });

  if (State.game.lives > 0) {
    gameAnimFrame = requestAnimationFrame(gameLoop);
  }
}

async function gameOver() {
  if (State.game.spawnTimer) clearTimeout(State.game.spawnTimer);
  cancelAnimationFrame(gameAnimFrame);
  DOM.gameInput.disabled = true;
  DOM.btnGameStart.style.display = '';
  DOM.btnGameStop.style.display  = 'none';
  DOM.gameInput.value = '';

  const wpm  = State.game.score;
  const acc  = State.game.score > 0
    ? Math.round((State.game.score / (State.game.score + State.game.missed)) * 100)
    : 0;
  const dur  = 0;

  await postResults(wpm, acc, 'game', dur, wpm, 100);
  showResults(wpm, acc, State.game.missed, dur, 'game', wpm, 100);
}

function startGame() {
  resetGameState();
  DOM.gameInput.disabled = false;
  DOM.gameInput.focus();
  DOM.btnGameStart.style.display = 'none';
  DOM.btnGameStop.style.display  = '';

  const scheduleNextSpawn = () => {
    if (State.game.lives <= 0) return;

    const milestone = Math.floor(State.game.score / 5);
    State.game.spawnDelay = Math.max(1200, 2500 - milestone * 150);
    State.game.fallDur    = Math.max(5000, 10000 - milestone * 500);

    spawnGameWord();
    State.game.spawnTimer = setTimeout(scheduleNextSpawn, State.game.spawnDelay);
  };
  
  scheduleNextSpawn();
  gameAnimFrame = requestAnimationFrame(gameLoop);
}

function stopGame() { gameOver(); }

DOM.btnGameStart.addEventListener('click', () => {
   if (gameWordPool.length === 0) {
      loadGameWords().then(startGame);
   } else {
      startGame();
   }
});
DOM.btnGameStop.addEventListener('click',  stopGame);

DOM.gameInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();

  const typed = DOM.gameInput.value.trim();
  if (!typed) return;

  const idx = gameActiveWords.findIndex(w => w.word === typed);
  if (idx !== -1) {
    gameActiveWords[idx].el.remove();
    gameActiveWords.splice(idx, 1);
    State.game.score++;
    DOM.gameScore.textContent = State.game.score;

    const elapsed = (Date.now() - (gameActiveWords[0]?.startTime || Date.now())) / 60000 || 0.1;
    DOM.gameWpm.textContent = Math.round(State.game.score / elapsed) || State.game.score;
  }

  DOM.gameInput.value = '';
  highlightTarget();
});

DOM.gameInput.addEventListener('input', highlightTarget);

/* ── Results Overlay ─────────────────────────────── */
function closeResults() {
  DOM.resultsOverlay.classList.remove('show');
}

function showResults(wpm, acc, errors, dur, mode, rawWpm = 0, consistency = 100) {
  DOM.resWpm.textContent         = wpm;
  if (DOM.resRawWpm) DOM.resRawWpm.textContent = rawWpm;
  DOM.resAcc.textContent         = acc + '%';
  if (DOM.resConsistency) DOM.resConsistency.textContent = consistency + '%';
  DOM.resErrors.textContent      = errors;
  DOM.resDuration.textContent    = dur > 0 ? (dur + 's') : '-';
  DOM.resMode.textContent        = mode.toUpperCase();

  DOM.resultsOverlay.classList.add('show');
  // Focus the try-again button so Enter key works immediately
  setTimeout(() => DOM.btnResRestart.focus(), 100);
}

// Click on the dark overlay backdrop (not the card) to dismiss
DOM.resultsOverlay.addEventListener('click', (e) => {
  if (e.target === DOM.resultsOverlay) closeResults();
});

DOM.btnResRestart.addEventListener('click', () => {
  closeResults();
  if (State.mode === 'standard') loadStandardContent();
  else if (State.mode === 'code') loadCodeContent();
  else if (State.mode === 'game') startGame();
});

DOM.btnResAnalytics.addEventListener('click', () => {
  closeResults();
  switchTab('analytics');
});



/* ── Analytics ───────────────────────────────────── */
let chartInstance = null;

async function loadAnalytics() {
  const filter = DOM.analyticsFilter.value;
  const url = filter === 'all' ? '/api/stats/all' : `/api/stats?mode=${filter}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Normalize data structure (Direct list from /all vs {recent:[]} from /stats)
    const results = Array.isArray(data) ? data : (data.recent || []);
    const stats   = Array.isArray(data) ? {
        personal_best_wpm: results.length ? Math.max(...results.map(r=>r.wpm)) : 0,
        average_wpm: results.length ? results.reduce((a,b)=>a+b.wpm,0)/results.length : 0,
        average_accuracy: results.length ? results.reduce((a,b)=>a+b.accuracy,0)/results.length : 0,
        total_sessions: results.length
    } : data;
    
    renderHistoryTable(results);
    renderChart([...results].reverse());
    
    DOM.statsTotal.textContent = stats.total_sessions || 0;
    DOM.statsBest.textContent  = Math.round(stats.personal_best_wpm || 0);
    DOM.statsWpm.textContent   = Math.round(stats.average_wpm || 0);
    DOM.statsAcc.textContent   = Math.round(stats.average_accuracy || 0) + '%';
    
  } catch(e) { console.error("Error loading analytics:", e); }
}

function renderHistoryTable(results) {
  DOM.historyTbody.innerHTML = '';
  if (!results.length) {
     DOM.historyTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:24px">No sessions yet.</td></tr>';
     return;
  }
  results.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="wpm-cell">${r.wpm}</td>
      <td class="acc-cell">${r.accuracy}%</td>
      <td><span class="badge-${r.mode}">${r.mode.toUpperCase()}</span></td>
      <td>${r.duration}s</td>
      <td style="font-size:0.7rem;color:var(--text-dim)">${r.timestamp}</td>
    `;
    DOM.historyTbody.appendChild(tr);
  });
}

function renderChart(results) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  
  const labels = results.map(r => r.timestamp.split(' ')[1] || r.timestamp);
  const wpms = results.map(r => r.wpm);
  const accs = results.map(r => r.accuracy);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'WPM',
          data: wpms,
          borderColor: '#FFB800',
          backgroundColor: 'rgba(255, 184, 0, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Accuracy',
          data: accs,
          borderColor: '#FF5733',
          backgroundColor: 'transparent',
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { color: '#2A2A2A' }, ticks: { color: '#888888' } },
        y: { type: 'linear', position: 'left', grid: { color: '#2A2A2A' }, ticks: { color: '#FFB800' } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100, ticks: { color: '#FF5733' } }
      },
      plugins: {
        legend: { labels: { color: '#CCCCCC' } }
      }
    }
  });
}

DOM.analyticsFilter.addEventListener('change', loadAnalytics);

/* ── Global Keyboard Shortcuts ───────────────────── */
document.addEventListener('keydown', e => {
  // Escape: close results overlay
  if (e.key === 'Escape') {
    if (DOM.resultsOverlay.classList.contains('show')) {
      closeResults();
      return;
    }
  }
});

/* ── Initialization ──────────────────────────────── */
window.onload = () => {
  resetTimerOpts();
  switchTab('standard');
  loadGameWords();
  loadCodeContent();
};

/* End of file */
