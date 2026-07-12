/* ============================================================
   칠문(七門) — 앱 UI 흐름
   ============================================================ */

const state = {
  name: '', birth: null, time: null, hourUnknown: false, gender: '',
  saju: null, zodiac: null, moon: null,
  face: {}, palm: [], iching: null, tarot: [],
  fusion: null, fable: null, seed: '',
};

const GATES = [
  { id: 'info',   icon: '🏮', label: '문패' },
  { id: 'saju',   icon: '☯', label: '사주' },
  { id: 'astro',  icon: '✦', label: '점성' },
  { id: 'face',   icon: '👁', label: '관상' },
  { id: 'palm',   icon: '🖐', label: '손금' },
  { id: 'iching', icon: '䷀', label: '주역' },
  { id: 'tarot',  icon: '🂠', label: '타로' },
];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- 별밭 배경 ----------
(function starfield() {
  const c = $('#starfield');
  const ctx = c.getContext('2d');
  let stars = [];
  function resize() {
    c.width = innerWidth; c.height = innerHeight;
    stars = Array.from({ length: Math.min(160, innerWidth / 6) }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.4 + 0.2, p: Math.random() * Math.PI * 2,
      s: 0.4 + Math.random() * 1.2,
    }));
  }
  addEventListener('resize', resize);
  resize();
  (function tick(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const st of stars) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 1000 * st.s + st.p));
      ctx.fillStyle = `rgba(232,228,244,${a})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  })(0);
})();

// ---------- 화면 전환 ----------
function show(id) {
  $$('.screen').forEach(s => s.classList.remove('visible'));
  $(`#screen-${id}`).classList.add('visible');
  const gi = GATES.findIndex(g => g.id === id);
  $$('#gate-progress .gate-dot').forEach((d, i) => {
    d.classList.toggle('active', i === gi);
    d.classList.toggle('done', gi === -1 ? id === 'report' || id === 'weaving' : i < gi);
  });
  $('#gate-progress').style.display = (id === 'intro') ? 'none' : 'flex';
  scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- 진행 표시 초기화 ----------
(function initProgress() {
  $('#gate-progress').innerHTML = GATES.map(g =>
    `<div class="gate-dot"><div class="orb">${g.icon}</div>${g.label}</div>`).join('');
})();

// ---------- 1문: 문패 ----------
$('#btn-enter').addEventListener('click', () => show('info'));

$('#chk-hour-unknown').addEventListener('change', (e) => {
  $('#in-time').disabled = e.target.checked;
});

$('#btn-info-next').addEventListener('click', () => {
  const name = $('#in-name').value.trim();
  const birth = $('#in-birth').value;
  const time = $('#in-time').value;
  const hourUnknown = $('#chk-hour-unknown').checked;
  if (!birth) { alert('생년월일을 알려주셔야 문이 열립니다.'); return; }
  if (!hourUnknown && !time) { alert('태어난 시각을 고르거나 "시간 모름"에 표시해 주세요.'); return; }

  const [y, m, d] = birth.split('-').map(Number);
  if (y < 1900 || y > 2100) { alert('1900년~2100년 사이만 헤아릴 수 있습니다.'); return; }
  let hh = 12, mm = 0;
  if (!hourUnknown) [hh, mm] = time.split(':').map(Number);

  state.name = name || '나그네';
  state.birth = { y, m, d };
  state.time = { hh, mm };
  state.hourUnknown = hourUnknown;
  state.seed = `${name}|${birth}|${hourUnknown ? 'x' : time}`;

  state.saju = calcSaju(y, m, d, hh, mm, hourUnknown);
  state.zodiac = calcZodiac(m, d);
  state.moon = calcMoonPhase(y, m, d);

  renderSaju();
  show('saju');
});

// ---------- 2문: 사주 ----------
function renderSaju() {
  const s = state.saju;
  const order = [['hour', '시주(時柱)'], ['day', '일주(日柱)'], ['month', '월주(月柱)'], ['year', '연주(年柱)']];
  $('#saju-pillars').innerHTML = order.map(([key, label]) => {
    const p = s.pillars[key];
    if (!p) return `<div class="pillar"><div class="plabel">${label}</div><div class="glyph dim" style="font-size:18px;padding:12px 0">모름</div></div>`;
    const st = STEMS[p[0]], br = BRANCHES[p[1]];
    return `<div class="pillar">
      <div class="plabel">${label}</div>
      <div class="glyph"><span class="el-${st.el}">${st.hanja}</span><br><span class="el-${br.el}">${br.hanja}</span></div>
      <div class="kr">${st.kr}${br.kr}</div>
    </div>`;
  }).join('');

  const stem = STEMS[s.dayStem];
  $('#saju-daymaster').innerHTML = `
    <h3>일간(日干) — 나의 본질: <span class="el-${stem.el}">${stem.kr}${stem.hanja} · ${stem.image}</span></h3>
    <p>${stem.text}</p>`;

  const total = Object.values(s.elCount).reduce((a, b) => a + b, 0) || 1;
  $('#saju-elements').innerHTML = '<h3>팔자 속 오행의 물결</h3><div class="el-bars">' +
    ELEMENTS.map(el => {
      const n = s.elCount[el];
      return `<div class="el-bar-row">
        <span class="el-name el-${el}">${el} ${ELEMENT_INFO[el].hanja}</span>
        <div class="el-bar-track"><div class="el-bar-fill" style="width:${(n / total) * 100}%;background:${ELEMENT_INFO[el].color}"></div></div>
        <span class="dim">${n}</span></div>`;
    }).join('') + '</div>';

  const gEntries = Object.entries(s.gods).sort((a, b) => b[1] - a[1]);
  const domGod = TEN_GODS[gEntries[0][0]];
  $('#saju-gods').innerHTML = `
    <h3>가장 강한 십신 — ${domGod.name}</h3>
    <p class="dim" style="margin-bottom:8px">${domGod.desc}</p>
    <p>${domGod.text}</p>`;

  $('#saju-animal').textContent = `${BRANCHES[(state.saju.pillars.year[1])].hanja} · ${state.saju.zodiacAnimal}띠`;
}
$('#btn-saju-next').addEventListener('click', () => { renderAstro(); show('astro'); });

// ---------- 3문: 점성 ----------
function renderAstro() {
  const z = state.zodiac, mp = state.moon;
  $('#astro-zodiac').innerHTML = `
    <div class="zodiac-hero">
      <div class="zsym">${z.symbol}</div>
      <div class="zname">${z.name}</div>
      <div class="dim">${z.el}의 별자리 · ${z.key}</div>
    </div>
    <p>${z.text}</p>`;
  $('#astro-moon').innerHTML = `
    <h3>태어난 밤의 달 — ${mp.phase.name}</h3>
    <div class="moon-row">
      <div class="micon">${mp.phase.icon}</div>
      <p>${mp.phase.text}<br><span class="dim">달의 나이 ${mp.age}일 · 키워드 「${mp.phase.key}」</span></p>
    </div>`;
}
$('#btn-astro-next').addEventListener('click', () => { renderFace(); show('face'); });

// ---------- 4문: 관상 ----------
function renderFace() {
  $('#face-parts').innerHTML = FACE_PARTS.map(part => `
    <div class="face-part" data-part="${part.id}">
      <div class="fp-head">
        <span class="fp-name">${part.name}</span>
        <span class="fp-hanja">${part.hanja}</span>
        <span class="dim">${part.desc}</span>
      </div>
      <div class="face-opts">
        ${part.options.map((o, i) => `<button class="face-opt" data-part="${part.id}" data-i="${i}">${o.label}</button>`).join('')}
      </div>
    </div>`).join('');

  $$('#face-parts .face-opt').forEach(btn => btn.addEventListener('click', () => {
    const pid = btn.dataset.part, i = Number(btn.dataset.i);
    const part = FACE_PARTS.find(p => p.id === pid);
    state.face[pid] = part.options[i];
    $$(`#face-parts .face-opt[data-part="${pid}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    $('#btn-face-next').disabled = Object.keys(state.face).length < FACE_PARTS.length;
  }));
  $('#btn-face-next').disabled = true;
}
$('#btn-face-next').addEventListener('click', () => { initPalm(); show('palm'); });

// ---------- 5문: 손금 ----------
const palm = { step: 0, strokes: [], drawing: false, points: [] };

function initPalm() {
  palm.step = 0; palm.strokes = []; state.palm = [];
  const c = $('#palm-canvas');
  c.width = 440; c.height = 520;
  drawPalmBase();
  updatePalmUI();
}

function drawPalmBase() {
  const c = $('#palm-canvas'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  // 손바닥 실루엣
  ctx.save();
  ctx.translate(220, 280);
  ctx.fillStyle = 'rgba(212,181,106,0.07)';
  ctx.strokeStyle = 'rgba(212,181,106,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // 손바닥 + 손가락 단순 실루엣
  ctx.moveTo(-110, 180);
  ctx.bezierCurveTo(-150, 80, -140, -20, -100, -70);   // 엄지쪽 옆면
  ctx.bezierCurveTo(-120, -110, -90, -135, -68, -105); // 검지
  ctx.lineTo(-60, -140); ctx.bezierCurveTo(-55, -175, -25, -175, -22, -140); ctx.lineTo(-20, -105);
  ctx.lineTo(-12, -150); ctx.bezierCurveTo(-6, -185, 24, -183, 26, -148); ctx.lineTo(24, -105);
  ctx.lineTo(34, -135); ctx.bezierCurveTo(42, -168, 70, -162, 68, -128); ctx.lineTo(62, -95);
  ctx.bezierCurveTo(95, -80, 105, -40, 100, 20);
  ctx.bezierCurveTo(98, 100, 60, 170, 0, 195);
  ctx.bezierCurveTo(-50, 205, -95, 200, -110, 180);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 엄지
  ctx.beginPath();
  ctx.moveTo(-100, -60);
  ctx.bezierCurveTo(-160, -70, -185, -30, -170, 5);
  ctx.bezierCurveTo(-160, 35, -130, 55, -105, 60);
  ctx.strokeStyle = 'rgba(212,181,106,0.25)';
  ctx.stroke();
  ctx.restore();

  // 이미 그린 선들
  palm.strokes.forEach((stroke, i) => {
    ctx.strokeStyle = PALM_LINES[i].color;
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = PALM_LINES[i].color; ctx.shadowBlur = 8;
    ctx.beginPath();
    stroke.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
}

function updatePalmUI() {
  const done = palm.step >= PALM_LINES.length;
  $('#palm-instruction').innerHTML = done
    ? '세 갈래 손금이 모두 새겨졌습니다 ✨'
    : `<b>${PALM_LINES[palm.step].name}</b>을 손바닥 위에 한 획으로 그려주세요<br><span class="dim">${PALM_LINES[palm.step].guide}</span>`;
  $('#palm-steps').innerHTML = PALM_LINES.map((l, i) =>
    `<div class="palm-step-dot ${i < palm.step ? 'done' : ''}" title="${l.name}"></div>`).join('');
  $('#btn-palm-next').disabled = !done;
  $('#btn-palm-redo').style.display = palm.step > 0 ? 'inline-block' : 'none';
}

(function bindPalm() {
  const c = $('#palm-canvas');
  const pos = (e) => {
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e) => {
    if (palm.step >= PALM_LINES.length) return;
    e.preventDefault();
    palm.drawing = true; palm.points = [pos(e)];
  };
  const move = (e) => {
    if (!palm.drawing) return;
    e.preventDefault();
    palm.points.push(pos(e));
    drawPalmBase();
    const ctx = c.getContext('2d');
    ctx.strokeStyle = PALM_LINES[palm.step].color;
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    palm.points.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };
  const end = () => {
    if (!palm.drawing) return;
    palm.drawing = false;
    const stroke = analyzePalmStroke(palm.points);
    if (!stroke) { drawPalmBase(); return; } // 너무 짧으면 무시
    const line = PALM_LINES[palm.step];
    const diag = Math.hypot(c.width, c.height);
    state.palm.push({ line, result: interpretPalm(line, stroke, diag * 0.72) });
    palm.strokes.push(palm.points.slice());
    palm.step++;
    drawPalmBase();
    updatePalmUI();
  };
  c.addEventListener('mousedown', start); c.addEventListener('mousemove', move);
  addEventListener('mouseup', end);
  c.addEventListener('touchstart', start, { passive: false });
  c.addEventListener('touchmove', move, { passive: false });
  c.addEventListener('touchend', end);
})();

$('#btn-palm-redo').addEventListener('click', () => {
  if (palm.step === 0) return;
  palm.step--; palm.strokes.pop(); state.palm.pop();
  drawPalmBase(); updatePalmUI();
});
$('#btn-palm-next').addEventListener('click', () => { initIching(); show('iching'); });

// ---------- 6문: 주역 ----------
const iching = { lines: [], rng: null };

function initIching() {
  iching.lines = [];
  iching.rng = seededRandom(state.seed + ':iching:' + Date.now());
  $('#hex-lines').innerHTML = '';
  $('#iching-result').innerHTML = '';
  $('#btn-cast').style.display = 'block';
  $('#btn-cast').disabled = false;
  $('#btn-iching-next').style.display = 'none';
  $('#coin-area .coins').innerHTML = '<div class="coin">?</div><div class="coin">?</div><div class="coin">?</div>';
  $('#cast-count').textContent = '여섯 번 던져 여섯 효(爻)를 쌓습니다 — 0/6';
}

$('#btn-cast').addEventListener('click', () => {
  if (iching.lines.length >= 6) return;
  $('#btn-cast').disabled = true;
  const line = castLine(iching.rng);
  const coinEls = $$('#coin-area .coin');
  coinEls.forEach((el, i) => {
    el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin');
    setTimeout(() => { el.textContent = line.coins[i] ? '陽' : '陰'; }, 350);
  });
  setTimeout(() => {
    iching.lines.push(line);
    const div = document.createElement('div');
    div.className = `hex-line ${line.yang ? 'yang' : 'yin'} ${line.changing ? 'changing' : ''}`;
    div.innerHTML = `<span class="mark">${line.changing ? '動' : ''}</span><div class="bar"></div><span class="mark"></span>`;
    $('#hex-lines').appendChild(div);
    $('#cast-count').textContent = `여섯 번 던져 여섯 효(爻)를 쌓습니다 — ${iching.lines.length}/6`;
    if (iching.lines.length === 6) finishIching();
    else $('#btn-cast').disabled = false;
  }, 750);
});

function finishIching() {
  const result = resolveCasting(iching.lines);
  state.iching = { ...result, lines: iching.lines };
  const p = result.primary;
  let html = `<div class="panel">
    <h3>본괘(本卦) — 제${p.num}괘 「${p.info.name} ${p.info.hanja}」</h3>
    <p class="dim" style="margin-bottom:6px">${p.upper.nature}(${p.upper.hanja}) 위에 ${p.lower.nature}(${p.lower.hanja}) · 키워드 「${p.info.key}」</p>
    <p>${p.info.text}</p></div>`;
  if (result.changed) {
    const ch = result.changed;
    html += `<div class="panel">
      <h3>지괘(之卦) — 변한 뒤의 길 「${ch.info.name} ${ch.info.hanja}」</h3>
      <p class="dim" style="margin-bottom:6px">움직인 효 ${result.changingCount}개가 가리키는 다음 국면</p>
      <p>${ch.info.text}</p></div>`;
  }
  $('#iching-result').innerHTML = html;
  $('#btn-cast').style.display = 'none';
  $('#btn-iching-next').style.display = 'block';
}
$('#btn-iching-next').addEventListener('click', () => { initTarot(); show('tarot'); });

// ---------- 7문: 타로 ----------
const tarot = { order: [], picked: 0, rng: null };
const TAROT_SLOTS = ['지나온 길', '지금 여기', '다가올 길'];

function initTarot() {
  state.tarot = [];
  tarot.picked = 0;
  tarot.rng = seededRandom(state.seed + ':tarot:' + Date.now());
  // 덱 셔플
  tarot.order = TAROT.map((_, i) => i);
  for (let i = tarot.order.length - 1; i > 0; i--) {
    const j = Math.floor(tarot.rng() * (i + 1));
    [tarot.order[i], tarot.order[j]] = [tarot.order[j], tarot.order[i]];
  }
  $('#tarot-picked').innerHTML = '';
  $('#btn-tarot-next').style.display = 'none';
  $('#tarot-guide').textContent = '마음이 끌리는 세 장을 차례로 고르세요 — 지나온 길 · 지금 여기 · 다가올 길';
  $('#tarot-deck').innerHTML = tarot.order.map((n, pos) =>
    `<div class="tcard-back" data-pos="${pos}">✶</div>`).join('');
  $$('#tarot-deck .tcard-back').forEach(el => el.addEventListener('click', () => pickTarot(el)));
}

function pickTarot(el) {
  if (tarot.picked >= 3 || el.classList.contains('picked')) return;
  el.classList.add('picked');
  const n = tarot.order[Number(el.dataset.pos)];
  const reversed = tarot.rng() < 0.32;
  const card = TAROT[n];
  state.tarot.push({ n, reversed });
  const slot = TAROT_SLOTS[tarot.picked];
  tarot.picked++;
  const div = document.createElement('div');
  div.className = `tcard ${reversed ? 'rev' : ''}`;
  div.innerHTML = `
    <div class="slot">${slot}</div>
    <div class="art">${card.icon}</div>
    <div class="tname">${card.name}</div>
    <div class="ten">${card.en} · ${['0','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ','Ⅺ','Ⅻ','ⅩⅢ','ⅩⅣ','ⅩⅤ','ⅩⅥ','ⅩⅦ','ⅩⅧ','ⅩⅨ','ⅩⅩ','ⅩⅪ'][card.n]}</div>
    ${reversed ? '<div class="rmark">역방향</div>' : ''}`;
  $('#tarot-picked').appendChild(div);
  if (tarot.picked === 3) {
    $('#tarot-guide').textContent = '세 장의 길이 정해졌습니다.';
    $('#btn-tarot-next').style.display = 'block';
  }
}

$('#btn-tarot-next').addEventListener('click', () => {
  show('weaving');
  setTimeout(buildReport, 2600);
});

// ---------- 직조실: 최종 리포트 ----------
function buildReport() {
  state.fusion = fuseElements(state);
  const frng = seededRandom(state.seed + ':fable');
  state.fable = generateFable(state, state.fusion, frng);

  const f = state.fusion;
  const strong = ELEMENT_INFO[f.strongest], weak = ELEMENT_INFO[f.weakest];
  const s = state.saju, stem = STEMS[s.dayStem];
  const maxScore = Math.max(...ELEMENTS.map(el => f.score[el]), 1);

  // 오행 융합 차트
  $('#report-fusion').innerHTML = `
    <h3>일곱 문에서 모은 기운의 직조</h3>
    <div class="el-bars">${ELEMENTS.map(el => `
      <div class="el-bar-row">
        <span class="el-name el-${el}">${el} ${ELEMENT_INFO[el].hanja}</span>
        <div class="el-bar-track"><div class="el-bar-fill" style="width:${(f.score[el] / maxScore) * 100}%;background:${ELEMENT_INFO[el].color}"></div></div>
        <span class="dim">${f.score[el]}</span></div>`).join('')}
    </div>
    <p style="margin-top:12px"><b class="el-${f.strongest}">주(主) 기운 — ${f.strongest}(${strong.hanja})</b><br>${strong.strongText}</p>
    <p style="margin-top:10px"><b class="el-${f.weakest}">보(補) 기운 — ${f.weakest}(${weak.hanja})</b><br>${weak.weakText}</p>`;

  // 문별 요약
  const gEntries = Object.entries(s.gods).sort((a, b) => b[1] - a[1]);
  const palmSummary = state.palm.map(p => `<b style="color:${p.line.color}">${p.line.name}</b> — ${p.result.lengthText}`).join('<br>');
  const faceSummary = FACE_PARTS.map(part => {
    const sel = state.face[part.id];
    return sel ? `<b>${part.name}</b> — ${sel.text}` : '';
  }).filter(Boolean).join('<br>');
  const tarotSummary = state.tarot.map((c, i) => {
    const card = TAROT[c.n];
    return `<b>${TAROT_SLOTS[i]} · ${card.icon} ${card.name}${c.reversed ? '(역)' : ''}</b> — ${c.reversed ? card.rev : card.up}`;
  }).join('<br>');

  $('#report-gates').innerHTML = [
    ['☯', '사주명리', `일간 <b class="el-${stem.el}">${stem.kr}${stem.hanja}(${stem.image})</b> · ${state.saju.zodiacAnimal}띠 · 십신의 중심 <b>${TEN_GODS[gEntries[0][0]].name}</b><br>${stem.text}`],
    ['✦', '별과 달', `<b>${state.zodiac.symbol} ${state.zodiac.name}</b> · ${state.moon.phase.icon} ${state.moon.phase.name}<br>${state.zodiac.text}`],
    ['👁', '관상', faceSummary],
    ['🖐', '손금', palmSummary],
    ['䷀', '주역', `본괘 <b>「${state.iching.primary.info.name}」</b>${state.iching.changed ? ` → 지괘 <b>「${state.iching.changed.info.name}」</b>` : ''}<br>${state.iching.primary.info.text}`],
    ['🂠', '타로', tarotSummary],
  ].map(([ico, name, body]) => `
    <div class="panel report-section">
      <div class="report-head"><span class="ico">${ico}</span>${name}</div>
      <p style="font-size:13.5px">${body}</p>
    </div>`).join('');

  // 행운 요소
  $('#report-lucky').innerHTML = `
    <h3>운을 여는 열쇠 (부족한 ${f.weakest} 기운 보완)</h3>
    <div class="lucky-grid">
      <div class="lucky-item"><div class="lk">행운의 색</div><div class="lv">${weak.hex}</div></div>
      <div class="lucky-item"><div class="lk">행운의 방위</div><div class="lv">${weak.dir}</div></div>
      <div class="lucky-item"><div class="lk">행운의 숫자</div><div class="lv">${weak.nums.join(' · ')}</div></div>
      <div class="lucky-item"><div class="lk">힘이 되는 계절</div><div class="lv">${weak.season}</div></div>
      <div class="lucky-item"><div class="lk">기를 덕목</div><div class="lv">${weak.virtue.split('·')[0]}</div></div>
    </div>`;

  // 우화
  $('#report-fable').innerHTML = `
    <h3>${state.name}님의 운명 우화 ${state.fable.title}</h3>
    ${state.fable.paragraphs.map(p => `<p>${p}</p>`).join('')}`;

  // 문장(紋章)
  const sc = $('#sigil-canvas');
  sc.width = 640; sc.height = 640;
  drawSigil(sc, state, state.fusion, state.seed);

  show('report');
}

$('#btn-save-sigil').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `칠문_운명문장_${state.name}.png`;
  a.href = $('#sigil-canvas').toDataURL('image/png');
  a.click();
});

$('#btn-restart').addEventListener('click', () => {
  location.reload();
});
