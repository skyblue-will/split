/* ============================================
   SPLIT - Circuit Training Timer
   ============================================ */
(function () {
  'use strict';

  /* ---- Constants ---- */
  var STORAGE_KEY = 'split_workouts';
  var RING_RADIUS = 140;
  var CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  var COUNTDOWN_FROM = 3;

  /* ---- Presets ---- */
  var PRESETS = [
    {
      name: 'Full Body Blast',
      rounds: 3,
      restBetweenRounds: 60,
      exercises: [
        { name: 'Squats', work: 45, rest: 15 },
        { name: 'Push-ups', work: 45, rest: 15 },
        { name: 'Lunges', work: 45, rest: 15 },
        { name: 'Bent-over Rows', work: 45, rest: 15 },
        { name: 'Plank', work: 45, rest: 15 },
        { name: 'Burpees', work: 45, rest: 0 }
      ]
    },
    {
      name: 'Tabata',
      rounds: 8,
      restBetweenRounds: 0,
      exercises: [
        { name: 'All Out', work: 20, rest: 10 }
      ]
    },
    {
      name: 'Upper Body Circuit',
      rounds: 3,
      restBetweenRounds: 60,
      exercises: [
        { name: 'Push-ups', work: 40, rest: 20 },
        { name: 'Dumbbell Rows', work: 40, rest: 20 },
        { name: 'Shoulder Press', work: 40, rest: 20 },
        { name: 'Bicep Curls', work: 40, rest: 20 },
        { name: 'Tricep Dips', work: 40, rest: 0 }
      ]
    },
    {
      name: 'Core Crusher',
      rounds: 3,
      restBetweenRounds: 45,
      exercises: [
        { name: 'Plank', work: 40, rest: 15 },
        { name: 'Crunches', work: 30, rest: 15 },
        { name: 'Mountain Climbers', work: 30, rest: 15 },
        { name: 'Leg Raises', work: 30, rest: 15 },
        { name: 'Russian Twists', work: 30, rest: 0 }
      ]
    }
  ];

  /* ---- State ---- */
  var workouts = [];
  var editing = null;    // workout being created/edited
  var timer = null;      // active timer state
  var timerTick = null;  // interval id
  var wakeLock = null;
  var audioCtx = null;

  /* ============ Audio ============ */
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function beep(freq, ms, vol) {
    try {
      var c = ctx();
      var o = c.createOscillator();
      var g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(vol || 0.35, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
      o.start(c.currentTime);
      o.stop(c.currentTime + ms / 1000);
    } catch (_) {}
  }

  function sndTick()  { beep(880, 100, 0.4); }
  function sndWork()  { beep(1200, 180, 0.5); setTimeout(function(){ beep(1600, 140, 0.5); }, 120); }
  function sndRest()  { beep(520, 280, 0.35); }
  function sndDone()  {
    beep(880, 140, 0.5);
    setTimeout(function(){ beep(1100, 140, 0.5); }, 180);
    setTimeout(function(){ beep(1400, 140, 0.5); }, 360);
    setTimeout(function(){ beep(1760, 350, 0.6); }, 540);
  }

  /* ============ Vibration ============ */
  function vib(p) { try { navigator.vibrate(p); } catch(_){} }

  /* ============ Wake Lock ============ */
  function lockScreen() {
    try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function(l){ wakeLock = l; }); } catch(_){}
  }
  function unlockScreen() {
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
  }

  /* ============ Storage ============ */
  function load() {
    try { workouts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(_){ workouts = []; }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  }

  /* ============ Helpers ============ */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function fmt(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function totalTime(w) {
    var t = 0;
    for (var i = 0; i < w.exercises.length; i++) t += w.exercises[i].work + w.exercises[i].rest;
    t *= w.rounds;
    t += (w.restBetweenRounds || 0) * Math.max(0, w.rounds - 1);
    return t;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function buildIntervals(w) {
    var list = [];
    for (var r = 0; r < w.rounds; r++) {
      for (var i = 0; i < w.exercises.length; i++) {
        var ex = w.exercises[i];
        list.push({ name: ex.name, duration: ex.work, type: 'work', round: r + 1 });
        var isLast = (r === w.rounds - 1 && i === w.exercises.length - 1);
        if (ex.rest > 0 && !isLast) {
          list.push({ name: 'Rest', duration: ex.rest, type: 'rest', round: r + 1 });
        }
      }
      if (r < w.rounds - 1 && (w.restBetweenRounds || 0) > 0) {
        list.push({ name: 'Round Break', duration: w.restBetweenRounds, type: 'rest', round: r + 1 });
      }
    }
    return list;
  }

  /* ============ Rendering ============ */
  var $app = document.getElementById('app');

  var SEEN_KEY = 'split_seen_help';

  function nav(view, data) {
    if (view === 'home')   renderHome();
    if (view === 'create') renderCreate(data);
    if (view === 'timer')  launchTimer(data);
    if (view === 'help')   renderHelp();
  }

  /* ---- Home ---- */
  function renderHome() {
    editing = null;
    var html = '<div class="home-view">';
    html += '<header class="header">'
      + '<button class="btn-help" data-action="go-help" title="How to use"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></button>'
      + '<h1 class="logo"><span>S</span>PLIT</h1><p class="tagline">Circuit Training Timer</p></header>';

    if (workouts.length) {
      html += '<section class="section"><h2 class="section-title">Your Workouts</h2><div class="workout-list">';
      for (var i = 0; i < workouts.length; i++) {
        var w = workouts[i];
        html += '<div class="workout-card" data-action="edit-workout" data-id="' + w.id + '">'
          + '<div class="workout-card-body">'
          + '<h3 class="workout-card-name">' + esc(w.name) + '</h3>'
          + '<p class="workout-card-meta">' + w.exercises.length + ' exercise' + (w.exercises.length !== 1 ? 's':'')
          + ' &middot; ' + w.rounds + ' round' + (w.rounds !== 1 ? 's':'')
          + ' &middot; ' + fmt(totalTime(w)) + '</p>'
          + '</div>'
          + '<button class="btn-play" data-action="start-workout" data-id="' + w.id + '" title="Start">'
          + '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
          + '</button></div>';
      }
      html += '</div></section>';
    }

    html += '<button class="btn btn-primary btn-block btn-lg" data-action="go-create" style="margin-top:24px">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + ' New Workout</button>';

    html += '<section class="section" style="margin-top:36px"><h2 class="section-title">Quick Start</h2><div class="preset-grid">';
    for (var j = 0; j < PRESETS.length; j++) {
      var p = PRESETS[j];
      html += '<div class="preset-card">'
        + '<h3 class="preset-card-name">' + p.name + '</h3>'
        + '<p class="preset-card-meta">' + p.exercises.length + ' exercise' + (p.exercises.length!==1?'s':'')
        + ' &middot; ' + p.rounds + ' round' + (p.rounds!==1?'s':'')
        + ' &middot; ' + fmt(totalTime(p)) + '</p>'
        + '<div class="preset-card-actions">'
        + '<button class="btn btn-sm btn-ghost" data-action="save-preset" data-index="'+j+'">Save</button>'
        + '<button class="btn btn-sm btn-primary" data-action="start-preset" data-index="'+j+'">Start</button>'
        + '</div></div>';
    }
    html += '</div></section></div>';
    $app.innerHTML = html;
  }

  /* ---- Help / How To ---- */
  function renderHelp() {
    $app.innerHTML = '<div class="help-view">'
      + '<div class="help-header">'
      + '<button class="btn-back" data-action="go-home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg></button>'
      + '<h2>How It Works</h2>'
      + '</div>'

      + '<div class="help-steps">'

      + '<div class="help-step">'
      + '<div class="help-step-num">1</div>'
      + '<div class="help-step-body">'
      + '<h3>Pick or Build a Circuit</h3>'
      + '<p>Tap a <strong>Quick Start</strong> preset to go immediately, or hit <strong>New Workout</strong> to build your own. Name it, set your exercises, work times, rest times, and rounds.</p>'
      + '</div></div>'

      + '<div class="help-step">'
      + '<div class="help-step-num">2</div>'
      + '<div class="help-step-body">'
      + '<h3>Hit Start</h3>'
      + '<p>Tap the green play button. You get a <strong>3-2-1-GO</strong> countdown to get into position, then the timer runs your entire circuit automatically.</p>'
      + '</div></div>'

      + '<div class="help-step">'
      + '<div class="help-step-num">3</div>'
      + '<div class="help-step-body">'
      + '<h3>Train Hands-Free</h3>'
      + '<p><strong class="clr-primary">Green = WORK.</strong> <strong class="clr-accent">Orange = REST.</strong> Audio beeps and vibration tell you when to switch. No touching your phone mid-set.</p>'
      + '</div></div>'

      + '</div>'

      + '<div class="help-section">'
      + '<h3 class="help-section-title">During a Workout</h3>'
      + '<ul class="help-list">'
      + '<li><strong>Pause</strong> anytime with the centre button, pick up where you left off</li>'
      + '<li><strong>Skip Rest</strong> appears during rest intervals if you want to push through</li>'
      + '<li>The <strong>ring</strong> drains as each interval counts down</li>'
      + '<li>The <strong>progress bar</strong> at the bottom shows overall circuit progress</li>'
      + '<li><strong>X button</strong> (top right) stops the workout entirely</li>'
      + '</ul>'
      + '</div>'

      + '<div class="help-section">'
      + '<h3 class="help-section-title">Tips</h3>'
      + '<ul class="help-list">'
      + '<li>Turn your <strong>volume up</strong> &mdash; audio cues are the whole point</li>'
      + '<li>Prop your phone on a bench or against a rack &mdash; the timer is big enough to read from a few metres away</li>'
      + '<li>Your <strong>screen stays on</strong> during workouts automatically</li>'
      + '<li>Tap a saved workout card to <strong>edit</strong> it, or the green play button to start it</li>'
      + '<li>Hit <strong>Save</strong> on any preset to copy it to your workouts and customise it</li>'
      + '</ul>'
      + '</div>'

      + '<div class="help-section">'
      + '<h3 class="help-section-title">Install on Your Phone</h3>'
      + '<ul class="help-list">'
      + '<li><strong>Android:</strong> In Chrome, tap the menu &#8942; then "Add to Home Screen" or "Install App"</li>'
      + '<li><strong>iPhone:</strong> In Safari, tap Share then "Add to Home Screen"</li>'
      + '<li>Works <strong>offline</strong> after first load &mdash; no internet needed at the gym</li>'
      + '</ul>'
      + '</div>'

      + '<button class="btn btn-primary btn-block btn-lg" data-action="go-home" style="margin-top:24px">Got It</button>'

      + '</div>';

    localStorage.setItem(SEEN_KEY, '1');
  }

  /* ---- Create / Edit ---- */
  function renderCreate(w) {
    editing = w || {
      id: uid(),
      name: '',
      rounds: 3,
      restBetweenRounds: 60,
      exercises: [{ name: '', work: 45, rest: 15 }]
    };
    var isNew = !workouts.find(function(x){ return x.id === editing.id; });

    var html = '<div class="create-view"><div class="create-header">'
      + '<button class="btn-back" data-action="go-home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg></button>'
      + '<h2>' + (isNew ? 'New Workout' : 'Edit Workout') + '</h2>'
      + (!isNew ? '<button class="btn-delete-workout" data-action="delete-workout" data-id="'+editing.id+'">Delete</button>' : '')
      + '</div>';

    html += '<div class="form-group"><label class="form-label">Workout Name</label>'
      + '<input class="form-input" id="inp-name" type="text" placeholder="e.g. Push Day" value="' + esc(editing.name) + '" autocomplete="off"></div>';

    html += '<div class="form-row"><div class="form-group flex-1"><label class="form-label">Rounds</label>'
      + '<div class="stepper"><button class="stepper-btn" data-action="dec-rounds">&minus;</button>'
      + '<span class="stepper-value" id="val-rounds">' + editing.rounds + '</span>'
      + '<button class="stepper-btn" data-action="inc-rounds">+</button></div></div>'
      + '<div class="form-group flex-1"><label class="form-label">Round Rest</label>'
      + '<div class="time-input-group">'
      + '<input class="time-input" id="inp-rbr-m" type="number" min="0" max="99" value="'+Math.floor(editing.restBetweenRounds/60)+'" inputmode="numeric">'
      + '<span class="time-sep">:</span>'
      + '<input class="time-input" id="inp-rbr-s" type="number" min="0" max="59" value="'+(editing.restBetweenRounds%60)+'" inputmode="numeric">'
      + '</div></div></div>';

    html += '<div class="form-group"><label class="form-label">Exercises</label><div class="exercise-list" id="ex-list">';
    for (var i = 0; i < editing.exercises.length; i++) {
      html += exCard(editing.exercises[i], i, editing.exercises.length);
    }
    html += '</div>'
      + '<button class="btn btn-secondary btn-block" data-action="add-exercise">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
      + ' Add Exercise</button></div>';

    html += '<div class="create-footer"><button class="btn btn-primary btn-block btn-lg" data-action="save-workout">Save Workout</button></div></div>';

    $app.innerHTML = html;
    if (isNew && !editing.name) {
      setTimeout(function(){ var el = document.getElementById('inp-name'); if (el) el.focus(); }, 80);
    }
  }

  function exCard(ex, idx, total) {
    var h = '<div class="exercise-card" data-index="'+idx+'">'
      + '<div class="exercise-card-header">'
      + '<span class="exercise-number">'+(idx+1)+'</span>'
      + '<input class="form-input exercise-name" type="text" placeholder="Exercise name" value="'+esc(ex.name)+'" data-field="name" data-index="'+idx+'" autocomplete="off">'
      + '<div class="exercise-card-actions">';
    if (idx > 0)
      h += '<button class="btn-icon" data-action="move-ex" data-index="'+idx+'" data-dir="-1" title="Move up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18,15 12,9 6,15"/></svg></button>';
    if (idx < total - 1)
      h += '<button class="btn-icon" data-action="move-ex" data-index="'+idx+'" data-dir="1" title="Move down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6,9 12,15 18,9"/></svg></button>';
    if (total > 1)
      h += '<button class="btn-icon btn-icon-danger" data-action="del-ex" data-index="'+idx+'" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    h += '</div></div>';

    h += '<div class="exercise-times">'
      + '<div class="time-group"><label class="time-label work-label">WORK</label><div class="time-input-group">'
      + '<input class="time-input" type="number" min="0" max="99" value="'+Math.floor(ex.work/60)+'" data-field="work-min" data-index="'+idx+'" inputmode="numeric">'
      + '<span class="time-sep">:</span>'
      + '<input class="time-input" type="number" min="0" max="59" value="'+(ex.work%60)+'" data-field="work-sec" data-index="'+idx+'" inputmode="numeric">'
      + '</div></div>'
      + '<div class="time-group"><label class="time-label rest-label">REST</label><div class="time-input-group">'
      + '<input class="time-input" type="number" min="0" max="99" value="'+Math.floor(ex.rest/60)+'" data-field="rest-min" data-index="'+idx+'" inputmode="numeric">'
      + '<span class="time-sep">:</span>'
      + '<input class="time-input" type="number" min="0" max="59" value="'+(ex.rest%60)+'" data-field="rest-sec" data-index="'+idx+'" inputmode="numeric">'
      + '</div></div></div></div>';
    return h;
  }

  /* ---- Read form state into editing ---- */
  function syncForm() {
    if (!editing) return;
    var el;
    el = document.getElementById('inp-name');    if (el) editing.name = el.value;
    el = document.getElementById('val-rounds'); if (el) editing.rounds = parseInt(el.textContent) || 1;
    var rm = document.getElementById('inp-rbr-m');
    var rs = document.getElementById('inp-rbr-s');
    if (rm && rs) editing.restBetweenRounds = (parseInt(rm.value)||0)*60 + (parseInt(rs.value)||0);

    var cards = document.querySelectorAll('.exercise-card');
    editing.exercises = [];
    cards.forEach(function(card) {
      editing.exercises.push({
        name: (card.querySelector('.exercise-name') || {}).value || '',
        work: (parseInt((card.querySelector('[data-field="work-min"]')||{}).value)||0)*60
            + (parseInt((card.querySelector('[data-field="work-sec"]')||{}).value)||0),
        rest: (parseInt((card.querySelector('[data-field="rest-min"]')||{}).value)||0)*60
            + (parseInt((card.querySelector('[data-field="rest-sec"]')||{}).value)||0)
      });
    });
  }

  /* ============ Timer ============ */

  function renderTimer() {
    if (!timer) return;
    var iv = timer.intervals[timer.idx];
    var next = timer.intervals[timer.idx + 1];

    /* Countdown phase */
    if (timer.phase === 'countdown') {
      $app.innerHTML = '<div class="timer-view countdown-phase"><div class="countdown-container">'
        + '<div class="countdown-number" id="cd-num">' + timer.cdVal + '</div>'
        + '<div class="countdown-label">GET READY</div>'
        + '<div class="countdown-workout-name">' + esc(timer.workout.name || 'Workout') + '</div>'
        + '</div></div>';
      return;
    }

    /* Complete phase */
    if (timer.phase === 'complete') {
      var elapsed = Math.round((Date.now() - timer.startTime) / 1000);
      $app.innerHTML = '<div class="timer-view complete-phase"><div class="complete-container">'
        + '<div class="complete-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg></div>'
        + '<h1 class="complete-title">CRUSHED IT</h1>'
        + '<div class="complete-stats">'
        + '<div class="stat"><div class="stat-value">' + fmt(elapsed) + '</div><div class="stat-label">Total Time</div></div>'
        + '<div class="stat"><div class="stat-value">' + timer.workout.rounds + '</div><div class="stat-label">Rounds</div></div>'
        + '<div class="stat"><div class="stat-value">' + timer.workout.exercises.length + '</div><div class="stat-label">Exercises</div></div>'
        + '</div>'
        + '<button class="btn btn-primary btn-block btn-lg" data-action="go-home">Done</button>'
        + '</div></div>';
      return;
    }

    /* Active / Paused */
    var progress = iv.duration > 0 ? (timer.remaining / iv.duration) : 0;
    var offset = CIRCUMFERENCE * progress;
    var overall = ((timer.idx + (1 - progress)) / timer.intervals.length) * 100;

    $app.innerHTML = '<div class="timer-view ' + iv.type + '-phase">'
      + '<button class="timer-stop" data-action="stop-timer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
      + '<div class="timer-round">ROUND ' + iv.round + ' / ' + timer.workout.rounds + '</div>'
      + '<div class="timer-ring-container">'
      + '<svg class="timer-ring" viewBox="0 0 300 300">'
      + '<circle class="ring-bg" cx="150" cy="150" r="'+RING_RADIUS+'" stroke-dasharray="'+CIRCUMFERENCE+'" stroke-dashoffset="0"/>'
      + '<circle class="ring-progress '+iv.type+'" cx="150" cy="150" r="'+RING_RADIUS+'" stroke-dasharray="'+CIRCUMFERENCE+'" stroke-dashoffset="'+(CIRCUMFERENCE-offset)+'" id="ring"/>'
      + '</svg>'
      + '<div class="timer-center">'
      + '<div class="timer-type '+iv.type+'">' + iv.type.toUpperCase() + '</div>'
      + '<div class="timer-name" id="t-name">' + esc(iv.name) + '</div>'
      + '<div class="timer-time' + (timer.remaining <= 3 && timer.phase === 'active' ? ' warning' : '') + '" id="t-time">' + fmt(timer.remaining) + '</div>'
      + '</div></div>'
      + '<div class="timer-next" id="t-next">' + (next ? 'Next: ' + esc(next.name) + ' (' + fmt(next.duration) + ')' : 'Last interval!') + '</div>'
      + '<div class="timer-controls">'
      + '<button class="btn-timer-control" data-action="' + (timer.phase==='paused'?'resume':'pause') + '-timer" id="btn-pp">'
      + (timer.phase === 'paused'
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>')
      + '</button></div>'
      + (iv.type === 'rest' ? '<button class="btn-skip" data-action="skip-interval">Skip Rest</button>' : '')
      + '<div class="timer-progress-bar"><div class="timer-progress-fill '+iv.type+'" style="width:'+overall+'%" id="t-bar"></div></div>'
      + '</div>';
  }

  function updateDisplay() {
    if (!timer || timer.phase === 'countdown' || timer.phase === 'complete') return;
    var iv = timer.intervals[timer.idx];
    var progress = iv.duration > 0 ? (timer.remaining / iv.duration) : 0;
    var offset = CIRCUMFERENCE * progress;
    var overall = ((timer.idx + (1 - progress)) / timer.intervals.length) * 100;

    var tTime = document.getElementById('t-time');
    var ring  = document.getElementById('ring');
    var bar   = document.getElementById('t-bar');

    if (tTime) {
      tTime.textContent = fmt(timer.remaining);
      if (timer.remaining <= 3 && timer.phase === 'active') {
        tTime.classList.add('warning');
      } else {
        tTime.classList.remove('warning');
      }
    }
    if (ring) ring.setAttribute('stroke-dashoffset', CIRCUMFERENCE - offset);
    if (bar)  bar.style.width = overall + '%';
  }

  /* ---- Launch ---- */
  function launchTimer(workoutOrId) {
    var w;
    if (typeof workoutOrId === 'string') {
      w = workouts.find(function(x){ return x.id === workoutOrId; });
    } else {
      w = workoutOrId;
    }
    if (!w || !w.exercises.length) return;

    var intervals = buildIntervals(w);
    if (!intervals.length) return;

    timer = {
      workout: w,
      intervals: intervals,
      idx: 0,
      remaining: 0,
      intervalDuration: 0,
      phase: 'countdown',
      cdVal: COUNTDOWN_FROM,
      startTime: Date.now(),
      targetTime: 0
    };

    lockScreen();
    renderTimer();

    /* Countdown */
    var count = COUNTDOWN_FROM;
    sndTick(); vib([50]);

    timerTick = setInterval(function() {
      count--;
      if (count > 0) {
        timer.cdVal = count;
        sndTick(); vib([50]);
        var el = document.getElementById('cd-num');
        if (el) { el.textContent = count; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      } else if (count === 0) {
        timer.cdVal = 'GO';
        sndWork(); vib([200]);
        var el2 = document.getElementById('cd-num');
        if (el2) { el2.textContent = 'GO'; el2.classList.remove('pop'); void el2.offsetWidth; el2.classList.add('pop'); }
      } else {
        clearInterval(timerTick);
        beginActive();
      }
    }, 1000);
  }

  function beginActive() {
    timer.phase = 'active';
    timer.idx = 0;
    timer.intervalDuration = timer.intervals[0].duration;
    timer.remaining = timer.intervals[0].duration;
    timer.targetTime = Date.now() + timer.remaining * 1000;
    timer.startTime = Date.now();
    renderTimer();
    timerTick = setInterval(tick, 50);
  }

  function tick() {
    if (!timer || timer.phase !== 'active') return;
    var now = Date.now();
    var newRem = Math.ceil((timer.targetTime - now) / 1000);
    if (newRem !== timer.remaining) {
      var old = timer.remaining;
      timer.remaining = Math.max(0, newRem);
      if (timer.remaining > 0 && timer.remaining <= 3 && old > timer.remaining) {
        sndTick(); vib([50]);
      }
      if (timer.remaining <= 0) {
        advance();
        return;
      }
    }
    updateDisplay();
  }

  function advance() {
    timer.idx++;
    if (timer.idx >= timer.intervals.length) {
      clearInterval(timerTick);
      timer.phase = 'complete';
      sndDone(); vib([200,100,200,100,400]);
      unlockScreen();
      renderTimer();
      return;
    }
    var iv = timer.intervals[timer.idx];
    timer.intervalDuration = iv.duration;
    timer.remaining = iv.duration;
    timer.targetTime = Date.now() + iv.duration * 1000;

    if (iv.type === 'work') { sndWork(); vib([200]); }
    else                    { sndRest(); vib([100,50,100]); }
    renderTimer();
  }

  function pauseTimer() {
    if (!timer || timer.phase !== 'active') return;
    clearInterval(timerTick);
    timer.phase = 'paused';
    timer.remaining = Math.max(0, Math.ceil((timer.targetTime - Date.now()) / 1000));
    renderTimer();
  }

  function resumeTimer() {
    if (!timer || timer.phase !== 'paused') return;
    timer.phase = 'active';
    timer.targetTime = Date.now() + timer.remaining * 1000;
    renderTimer();
    timerTick = setInterval(tick, 50);
  }

  function stopTimer() {
    clearInterval(timerTick);
    timer = null;
    unlockScreen();
    nav('home');
  }

  /* ============ Events ============ */
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var action = btn.dataset.action;
    var idx = parseInt(btn.dataset.index);
    var id  = btn.dataset.id;
    var dir = parseInt(btn.dataset.dir);

    switch (action) {
      case 'go-home':
        editing = null;
        nav('home');
        break;

      case 'go-create':
        nav('create');
        break;

      case 'go-help':
        nav('help');
        break;

      case 'edit-workout':
        var ew = workouts.find(function(x){ return x.id === id; });
        if (ew) nav('create', JSON.parse(JSON.stringify(ew)));
        break;

      case 'start-workout':
        launchTimer(id);
        break;

      case 'start-preset':
        launchTimer(JSON.parse(JSON.stringify(PRESETS[idx])));
        break;

      case 'save-preset':
        var cp = JSON.parse(JSON.stringify(PRESETS[idx]));
        cp.id = uid();
        workouts.push(cp);
        save();
        nav('home');
        break;

      case 'delete-workout':
        if (confirm('Delete this workout?')) {
          workouts = workouts.filter(function(x){ return x.id !== id; });
          save();
          editing = null;
          nav('home');
        }
        break;

      case 'add-exercise':
        syncForm();
        editing.exercises.push({ name: '', work: 45, rest: 15 });
        renderCreate(editing);
        setTimeout(function(){
          var list = document.getElementById('ex-list');
          if (list && list.lastElementChild) list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
        }, 60);
        break;

      case 'del-ex':
        if (editing.exercises.length <= 1) break;
        syncForm();
        editing.exercises.splice(idx, 1);
        renderCreate(editing);
        break;

      case 'move-ex':
        syncForm();
        var ni = idx + dir;
        if (ni < 0 || ni >= editing.exercises.length) break;
        var tmp = editing.exercises.splice(idx, 1)[0];
        editing.exercises.splice(ni, 0, tmp);
        renderCreate(editing);
        break;

      case 'inc-rounds':
        syncForm();
        editing.rounds = Math.min(50, editing.rounds + 1);
        var rv = document.getElementById('val-rounds');
        if (rv) rv.textContent = editing.rounds;
        break;

      case 'dec-rounds':
        syncForm();
        editing.rounds = Math.max(1, editing.rounds - 1);
        var rv2 = document.getElementById('val-rounds');
        if (rv2) rv2.textContent = editing.rounds;
        break;

      case 'save-workout':
        syncForm();
        if (!editing.name.trim()) editing.name = 'My Workout';
        editing.exercises = editing.exercises.filter(function(ex){ return ex.work > 0; });
        if (!editing.exercises.length) {
          alert('Add at least one exercise with work time > 0');
          break;
        }
        var ei = -1;
        for (var si = 0; si < workouts.length; si++) { if (workouts[si].id === editing.id) { ei = si; break; } }
        if (ei >= 0) workouts[ei] = editing;
        else workouts.push(editing);
        save();
        editing = null;
        nav('home');
        break;

      case 'pause-timer':
        pauseTimer();
        break;

      case 'resume-timer':
        resumeTimer();
        break;

      case 'stop-timer':
        if (confirm('Stop workout?')) stopTimer();
        break;

      case 'skip-interval':
        if (timer && timer.phase === 'active') advance();
        break;
    }
  });

  /* ---- Prevent form state loss from Enter key ---- */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.closest('.create-view')) {
      e.preventDefault();
    }
  });

  /* ---- Visibility change: re-acquire wake lock ---- */
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && timer && timer.phase === 'active') {
      lockScreen();
    }
  });

  /* ============ Service Worker ============ */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }

  /* ============ Init ============ */
  load();
  if (!localStorage.getItem(SEEN_KEY)) {
    nav('help');
  } else {
    nav('home');
  }

})();
