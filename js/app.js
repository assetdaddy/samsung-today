/* ============================================================
   칠문(七門) — 앱 UI 흐름 (독립 점술 허브)
   ============================================================ */

const state = {
  // 프로필
  name: '', birth: null, time: null, hourUnknown: false, gender: '', seed: '',
  // 점술별 결과 (각각 독립)
  saju: null, sajuDetail: null, zodiac: null, moon: null,
  face: {}, palm: [], iching: null, tarot: [],
  done: { saju: false, astro: false, face: false, palm: false, iching: false, tarot: false },
  // 직조실
  fusion: null, fable: null,
};

const MODULES = [
  { id: 'saju',   icon: '☯',  name: '사주명리', hanja: '四柱命理', desc: '만세력으로 세우는 여덟 글자 — 오행·십신·신살·대운까지', needsProfile: true },
  { id: 'astro',  icon: '✦',  name: '점성',     hanja: '占星',     desc: '태양궁 12궁과 태어난 밤의 달 위상', needsProfile: true },
  { id: 'face',   icon: '👁',  name: '관상',     hanja: '觀相',     desc: '오관(五官)의 생김으로 읽는 얼굴의 지도', needsProfile: false },
  { id: 'palm',   icon: '🖐',  name: '손금',     hanja: '手相',     desc: '직접 그린 세 갈래 선의 길이와 굽이를 분석', needsProfile: false },
  { id: 'iching', icon: '䷀',  name: '주역',     hanja: '周易',     desc: '동전 세 닢으로 세우는 육효점 — 본괘와 지괘', needsProfile: false },
  { id: 'tarot',  icon: '🂠',  name: '타로',     hanja: 'TAROT',    desc: '메이저 아르카나 22장에서 뽑는 세 장의 길', needsProfile: false },
];
const EXTRA_MODULES = [
  { id: 'gunghap', icon: '❤', name: '궁합', hanja: '宮合', desc: '두 사람의 사주로 보는 인연의 결 — 십신·합충·오행 상보' },
];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
let pendingModule = null; // 프로필 입력 후 이동할 모듈

// 테마 상세 해설 패널 HTML
function themeIntroHTML(key) {
  const t = THEME_INTRO[key];
  if (!t) return '';
  return `<details class="intro-box">
    <summary>❔ ${t.title}</summary>
    <div class="intro-body">${t.body.map(p => `<p>${p}</p>`).join('')}</div>
  </details>`;
}

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
  if (id !== 'face' && id !== 'palm') CameraKit.stop(); // 카메라 문을 벗어나면 스트림 종료
  $$('.screen').forEach(s => s.classList.remove('visible'));
  $(`#screen-${id}`).classList.add('visible');
  scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- 공용 카메라 ----------
const CameraKit = {
  stream: null,
  async start(video) {
    this.stop();
    const constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = this.stream;
    await video.play();
    return true;
  },
  stop() {
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
  },
  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
  // 비디오 프레임을 정사각형으로 잘라 dataURL 반환
  grab(video, size = 720) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const vw = video.videoWidth, vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.85);
  },
  fileToDataURL(file, cb) {
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  },
};

// ---------- 허브 ----------
function renderHub() {
  // 프로필 칩
  $('#profile-chip').innerHTML = state.birth
    ? `<div class="chip-row"><span class="pchip">🏮 ${state.name} · ${state.birth.y}.${String(state.birth.m).padStart(2, '0')}.${String(state.birth.d).padStart(2, '0')}${state.hourUnknown ? '' : ` ${String(state.time.hh).padStart(2, '0')}:${String(state.time.mm).padStart(2, '0')}`}</span>
       <button class="ghost" id="btn-edit-profile">문패 고치기</button></div>`
    : `<div class="chip-row"><span class="pchip dim">아직 문패가 비어 있습니다 — 사주·점성의 문을 열면 적게 됩니다</span></div>`;
  const edit = $('#btn-edit-profile');
  if (edit) edit.addEventListener('click', () => { pendingModule = null; fillProfileForm(); show('profile'); });

  const doneCount = Object.values(state.done).filter(Boolean).length;
  $('#hub-cards').innerHTML = MODULES.map(m => `
    <button class="hub-card ${state.done[m.id] ? 'done' : ''}" data-mod="${m.id}">
      <span class="hc-icon">${m.icon}</span>
      <span class="hc-body">
        <span class="hc-name">${m.name} <span class="hc-hanja">${m.hanja}</span></span>
        <span class="hc-desc">${m.desc}</span>
      </span>
      <span class="hc-state">${state.done[m.id] ? '다시 보기 ↻' : '문 열기 →'}</span>
    </button>`).join('') + `
    <div class="hub-divider"><span>인연을 보는 문</span></div>` +
    EXTRA_MODULES.map(m => `
    <button class="hub-card extra" data-mod="${m.id}">
      <span class="hc-icon">${m.icon}</span>
      <span class="hc-body">
        <span class="hc-name">${m.name} <span class="hc-hanja">${m.hanja}</span></span>
        <span class="hc-desc">${m.desc}</span>
      </span>
      <span class="hc-state">문 열기 →</span>
    </button>`).join('') + `
    <div class="hub-divider"><span>여섯 문을 모두 열면</span></div>
    <button class="hub-card weave ${doneCount === 6 ? '' : 'locked'}" data-mod="weave">
      <span class="hc-icon">🧵</span>
      <span class="hc-body">
        <span class="hc-name">직조실 <span class="hc-hanja">織造室</span></span>
        <span class="hc-desc">${doneCount === 6
          ? '여섯 점괘를 하나의 문장(紋章)과 우화로 직조합니다'
          : `여섯 문을 모두 연 이에게만 열립니다 — 지금 ${doneCount}/6`}</span>
      </span>
      <span class="hc-state">${doneCount === 6 ? '들어가기 →' : '🔒'}</span>
    </button>`;

  $$('#hub-cards .hub-card').forEach(card => card.addEventListener('click', () => openModule(card.dataset.mod)));
}

function openModule(id) {
  if (id === 'weave') {
    if (Object.values(state.done).filter(Boolean).length < 6) return;
    show('weaving');
    setTimeout(buildReport, 2400);
    return;
  }
  const mod = MODULES.find(m => m.id === id) || EXTRA_MODULES.find(m => m.id === id);
  if (mod.needsProfile && !state.birth) {
    pendingModule = id;
    fillProfileForm();
    show('profile');
    return;
  }
  if (id === 'saju') { renderSaju(); state.done.saju = true; }
  if (id === 'astro') { renderAstro(); state.done.astro = true; }
  if (id === 'face') initFace();
  if (id === 'palm') initPalm();
  if (id === 'iching') initIching();
  if (id === 'tarot') initTarot();
  if (id === 'gunghap') { initGunghap(); }
  show(id);
}

// ---------- 프로필 ----------
function fillProfileForm() {
  $('#in-name').value = state.name === '나그네' ? '' : state.name;
  if (state.birth) $('#in-birth').value = `${state.birth.y}-${String(state.birth.m).padStart(2, '0')}-${String(state.birth.d).padStart(2, '0')}`;
  if (state.time && !state.hourUnknown) $('#in-time').value = `${String(state.time.hh).padStart(2, '0')}:${String(state.time.mm).padStart(2, '0')}`;
  $('#chk-hour-unknown').checked = state.hourUnknown;
  $('#in-time').disabled = state.hourUnknown;
  $('#in-gender').value = state.gender;
}

$('#chk-hour-unknown').addEventListener('change', (e) => { $('#in-time').disabled = e.target.checked; });
$('#btn-profile-back').addEventListener('click', () => { pendingModule = null; show('intro'); });

$('#btn-profile-save').addEventListener('click', () => {
  const name = $('#in-name').value.trim();
  const birth = $('#in-birth').value;
  const time = $('#in-time').value;
  const hourUnknown = $('#chk-hour-unknown').checked;
  if (!birth) { alert('생년월일을 알려주셔야 문패를 걸 수 있습니다.'); return; }
  if (!hourUnknown && !time) { alert('태어난 시각을 고르거나 "시간 모름"에 표시해 주세요.'); return; }
  const [y, m, d] = birth.split('-').map(Number);
  if (y < 1900 || y > 2100) { alert('1900년~2100년 사이만 헤아릴 수 있습니다.'); return; }
  let hh = 12, mm = 0;
  if (!hourUnknown) [hh, mm] = time.split(':').map(Number);

  state.name = name || '나그네';
  state.birth = { y, m, d };
  state.time = { hh, mm };
  state.hourUnknown = hourUnknown;
  state.gender = $('#in-gender').value;
  state.seed = `${state.name}|${birth}|${hourUnknown ? 'x' : time}|${state.gender}`;

  state.saju = calcSaju(y, m, d, hh, mm, hourUnknown);
  state.sajuDetail = calcSajuDetail(state.saju, state.birth, state.gender);
  state.zodiac = calcZodiac(m, d);
  state.moon = calcMoonPhase(y, m, d);
  // 프로필이 바뀌면 사주·점성 결과도 새로 봐야 함
  state.done.saju = false; state.done.astro = false;

  renderHub();
  if (pendingModule) { const t = pendingModule; pendingModule = null; openModule(t); }
  else show('intro');
});

// ---------- 사주명리 (상세) ----------
function renderSaju() {
  const s = state.saju, det = state.sajuDetail;
  const stem = STEMS[s.dayStem];
  $('#saju-animal').textContent = `${BRANCHES[s.pillars.year[1]].hanja} · ${s.zodiacAnimal}띠`;
  $('#saju-intro').innerHTML = themeIntroHTML('saju');

  // 1) 원국 표 — 십신·지장간·십이운성까지
  const order = [['hour', '시주(時柱)'], ['day', '일주(日柱)'], ['month', '월주(月柱)'], ['year', '연주(年柱)']];
  $('#saju-pillars').innerHTML = order.map(([key, label]) => {
    const p = s.pillars[key];
    if (!p) return `<div class="pillar"><div class="plabel">${label}</div><div class="glyph dim" style="font-size:16px;padding:20px 0">모름</div></div>`;
    const st = STEMS[p[0]], br = BRANCHES[p[1]], dd = det.detail[key];
    return `<div class="pillar">
      <div class="plabel">${label}</div>
      <div class="pgod">${dd.stemGod}</div>
      <div class="glyph"><span class="el-${st.el}">${st.hanja}</span></div>
      <div class="glyph"><span class="el-${br.el}">${br.hanja}</span></div>
      <div class="pgod">${dd.branchGod}</div>
      <div class="phidden">藏 ${dd.hidden.map(h => STEMS[h].hanja).join('·')}</div>
      <div class="pstage">${dd.stage}</div>
    </div>`;
  }).join('');

  // 2) 일간 + 격국 + 신강약
  $('#saju-daymaster').innerHTML = `
    <h3>일간(日干) — 나의 본질: <span class="el-${stem.el}">${stem.kr}${stem.hanja} · ${stem.image}</span></h3>
    <p>${stem.text}</p>
    <p style="margin-top:10px"><span class="keyword-chip">${det.gyeok || '격국 미상'}</span><span class="keyword-chip">${det.strength}</span>
    <span class="dim">— 월지에서 얻은 그릇의 이름과, 기운의 세기입니다.</span></p>`;

  // 근묘화실(根苗花實) — 네 기둥의 궁위 해석
  const palaceOrder = ['year', 'month', 'day', 'hour'];
  $('#saju-palace').innerHTML = `
    <h3>네 기둥이 맡은 인생 — 근묘화실(根苗花實)</h3>
    <p class="dim" style="margin-bottom:12px">한 사람의 사주는 뿌리→싹→꽃→열매로 이어지는 한 그루 나무입니다. 각 기둥은 인생의 한 시절과 한 인연을 맡습니다.</p>
    ${palaceOrder.map(k => {
      const pal = PILLAR_PALACE[k], p = s.pillars[k], dd = det.detail[k];
      if (!p) return `<div class="palace-row"><div class="pal-badge">${pal.gung}</div><div class="pal-body"><b>${pal.label}</b> · ${pal.period}<br><span class="dim">시주 정보가 없어 이 자리는 비워 둡니다.</span></div></div>`;
      const st = STEMS[p[0]], br = BRANCHES[p[1]];
      const godForStar = (k === 'day') ? dd.branchGod : dd.stemGod;
      return `<div class="palace-row">
        <div class="pal-badge">${pal.gung}<span class="pal-glyph"><span class="el-${st.el}">${st.hanja}</span><span class="el-${br.el}">${br.hanja}</span></span></div>
        <div class="pal-body">
          <b>${pal.label}</b> · ${pal.period}
          <p style="margin:5px 0">${pal.role}</p>
          <p class="dim">${pal.star(godForStar)} 십이운성은 ${dd.stage}.</p>
        </div>
      </div>`;
    }).join('')}`;

  // 파자(破字) — 원국 여덟 글자를 쪼개 읽기 (중복 글자는 한 번만)
  const pillarKeys = ['day', 'month', 'year', 'hour']; // 일주를 먼저 (가장 중요)
  const pLabel = { day: '일간·일지 (나 자신과 그 안방)', month: '월주 (사회·부모)', year: '연주 (뿌리·조상)', hour: '시주 (말년·자식)' };
  const seenChar = new Set();
  let pazaCards = '';
  for (const k of pillarKeys) {
    const p = s.pillars[k];
    if (!p) continue;
    const items = [{ paza: STEM_PAZA[p[0]], role: '천간' }, { paza: BRANCH_PAZA[p[1]], role: '지지' }];
    for (const it of items) {
      if (seenChar.has(it.paza.char)) continue;
      seenChar.add(it.paza.char);
      pazaCards += `<div class="paza-card">
        <div class="paza-head"><span class="paza-glyph">${it.paza.char}</span>
          <span class="paza-meta"><b>${it.paza.char}</b> — ${it.paza.shape}</span></div>
        <p>${it.paza.read}</p></div>`;
    }
  }
  $('#saju-paza').innerHTML = `
    <h3>글자 속에 숨은 그림 — 파자(破字) 풀이</h3>
    <p class="dim" style="margin-bottom:12px">한자를 뜻이 아니라 <b>생김새</b>로 다시 읽습니다. 卯(묘)가 양쪽으로 열린 문이라 속을 훤히 열어 보이듯 — 당신의 여덟 글자에 숨은 그림을 하나씩 들춰 봅니다. (같은 글자는 한 번만)</p>
    ${pazaCards}`;

  // 3) 일주 심층 — 배우자궁과 그 별
  const dj = det.detail.day;
  const dGod = TEN_GODS_10[dj.branchGod];
  $('#saju-ilju').innerHTML = `
    <h3>일주(日柱) 깊이 읽기 — ${stem.kr}${BRANCHES[s.pillars.day[1]].kr}</h3>
    <p>일지(日支)는 나의 안방이자 배우자궁입니다. 그 자리에 <b>${dj.branchGod}(${dGod.hanja})</b> — ${dGod.short}이 앉아 있습니다. ${dGod.text}</p>
    <p style="margin-top:8px">십이운성으로는 <b>${dj.stage}(${STAGE_HANJA[TWELVE_STAGES.indexOf(dj.stage)]})</b>의 자리 — ${STAGE_TEXT[dj.stage]}</p>`;

  // 4) 오행 분포
  const total = Object.values(s.elCount).reduce((a, b) => a + b, 0) || 1;
  const maxEl = Math.max(...ELEMENTS.map(el => s.elCount[el]));
  const elComments = ELEMENTS.map(el => {
    const n = s.elCount[el];
    if (n === 0) return ELEMENT_BALANCE_TEXT.없음(el);
    if (n === maxEl && n >= 3) return ELEMENT_BALANCE_TEXT.많음(el);
    return null;
  }).filter(Boolean);
  $('#saju-elements').innerHTML = '<h3>오행 분석 — 팔자 속 다섯 기운의 균형</h3><div class="el-bars">' +
    ELEMENTS.map(el => {
      const n = s.elCount[el];
      return `<div class="el-bar-row">
        <span class="el-name el-${el}">${el} ${ELEMENT_INFO[el].hanja}</span>
        <div class="el-bar-track"><div class="el-bar-fill" style="width:${(n / total) * 100}%;background:${ELEMENT_INFO[el].color}"></div></div>
        <span class="dim">${n}</span></div>`;
    }).join('') + '</div>' +
    (elComments.length ? elComments.map(c => `<p style="margin-top:10px">${c}</p>`).join('') : '<p style="margin-top:10px" class="dim">다섯 기운이 비교적 고르게 자리했습니다 — 치우침이 적은 균형형입니다.</p>');

  // 5) 신강약 + 용신
  const yEl = ELEMENT_INFO[det.yongEl];
  $('#saju-strength').innerHTML = `
    <h3>기운의 저울 — ${det.strength} (${Math.round(det.ratio * 100)}%)</h3>
    <div class="gauge"><div class="gauge-fill" style="width:${Math.round(det.ratio * 100)}%"></div><div class="gauge-mid"></div></div>
    <p class="dim" style="margin:6px 0 10px">나를 받쳐주는 기운(인성·비겁)이 팔자에서 차지하는 무게입니다. 55%를 넘으면 신강, 45%에 못 미치면 신약으로 봅니다.</p>
    <p>${det.strength === '신강'
      ? '기운이 넉넉한 <b>신강</b>한 사주입니다. 넘치는 힘을 흘려보낼 출구가 필요합니다 — 일과 성취, 표현으로 기운을 써야 운이 돕니다.'
      : det.strength === '신약'
        ? '기운이 여린 <b>신약</b>한 사주입니다. 약한 것이 아니라 섬세한 것 — 나를 채워주는 사람과 공부, 휴식이 운의 연료가 됩니다.'
        : '치우침이 적은 <b>중화</b> 사주입니다. 어느 쪽으로든 갈 수 있는 균형의 그릇 — 부족한 기운만 살짝 보태면 됩니다.'}</p>
    <p style="margin-top:10px"><b class="el-${det.yongEl}">용신(用神) — ${det.yongEl}(${yEl.hanja}) · ${det.yongGroup}</b><br>
    ${yEl.weakText} <span class="dim">(간이 억부법 기준)</span></p>`;

  // 6) 십신 10종 심층 분석
  const gEntries = Object.entries(det.godCount).sort((a, b) => b[1] - a[1]);
  const topGod = gEntries[0][0];
  const presentGods = gEntries.filter(([g, n]) => n > 0).map(([g]) => g);
  const deepCard = (g, isTop) => {
    const info = TEN_GODS_10[g], deep = TEN_GODS_DEEP[g];
    return `<details class="god-deep ${isTop ? 'top' : ''}" ${isTop ? 'open' : ''}>
      <summary><span class="gd-name">${g} <span class="gd-hanja">${info.hanja}</span></span>
        <span class="gd-cnt">${det.godCount[g]}개</span>${isTop ? '<span class="gd-flag">중심</span>' : ''}</summary>
      <div class="gd-body">
        <div class="gd-keys">${deep.keywords.map(k => `<span class="gd-key">${k}</span>`).join('')}</div>
        <p><b class="gd-lab">심리</b> ${deep.mind}</p>
        <p><b class="gd-lab light">강점</b> ${deep.light}</p>
        <p><b class="gd-lab shadow">그림자(과다)</b> ${deep.shadow}</p>
        <p><b class="gd-lab">직업</b> ${deep.job}</p>
        <p><b class="gd-lab">관계</b> ${deep.relation}</p>
      </div>
    </details>`;
  };
  $('#saju-gods').innerHTML = `
    <h3>십신(十神) 심층 분석 — 팔자에 뜬 열 개의 별</h3>
    <div class="god-grid">${Object.entries(TEN_GODS_10).map(([g]) => `
      <div class="god-cell ${det.godCount[g] ? 'has' : ''} ${g === topGod && det.godCount[topGod] ? 'top' : ''}">
        <span class="gname">${g}</span><span class="gcount">${det.godCount[g] || '·'}</span>
      </div>`).join('')}
    </div>
    <p class="dim" style="margin:12px 0 6px">${TEN_GODS[TEN_GODS_10[topGod].group].desc} 계열이 사주의 중심 흐름입니다. 내 팔자에 <b>실제로 뜬 별</b>을 깊이 펼쳐 봅니다 (눌러서 열기).</p>
    ${presentGods.map(g => deepCard(g, g === topGod)).join('')}
    <p class="dim" style="margin-top:10px">※ 없는 십신은 그 분야의 인연이 옅다는 뜻이지 결핍이 아닙니다 — 대운·세운으로 채워지는 자리입니다.</p>`;

  // 6.5) 십이운성 심층 — 네 기둥의 기세
  const stageKind = { 장생:'왕성', 관대:'왕성', 건록:'왕성', 제왕:'왕성', 목욕:'중간', 쇠:'중간', 양:'중간', 태:'약함', 병:'약함', 사:'약함', 묘:'약함', 절:'약함' };
  const stageOrder = [['year','연주·초년'],['month','월주·청년'],['day','일주·중년'],['hour','시주·말년']];
  $('#saju-stages').innerHTML = `
    <h3>십이운성(十二運星) — 나의 기운이 흐르는 열두 생애</h3>
    <p class="dim" style="margin-bottom:12px">일간(나)이 각 기둥의 지지에서 <b>생·로·병·사</b> 어느 단계에 놓이는지 봅니다. 인생 시기별로 기운이 왕성한지 잦아드는지를 읽는 지표입니다.</p>
    ${stageOrder.map(([k, label]) => {
      const p = s.pillars[k]; if (!p) return '';
      const st = det.detail[k].stage, deep = STAGE_DEEP[st];
      return `<details class="god-deep">
        <summary><span class="gd-name">${st} <span class="gd-hanja">${deep.hanja}</span></span>
          <span class="gd-cnt">${label}</span><span class="stage-badge ${stageKind[st]==='왕성'?'strong':stageKind[st]==='약함'?'weak':''}">${stageKind[st]}</span></summary>
        <div class="gd-body">
          <p class="dim" style="margin-bottom:8px">「${deep.keyword}」 — ${deep.phase}</p>
          <p><b class="gd-lab">성향</b> ${deep.trait}</p>
          <p><b class="gd-lab">이 자리</b> ${deep.pos}</p>
          <p><b class="gd-lab shadow">주의</b> ${deep.caution}</p>
        </div>
      </details>`;
    }).join('')}`;

  // 7) 신살 심층
  $('#saju-sinsal').innerHTML = `
    <h3>신살(神殺) — 팔자에 깃든 특별한 별</h3>
    <p class="dim" style="margin-bottom:12px">타고난 기운의 무늬입니다. 길신은 살려 쓰고, 흉살은 <b>직업·전문성으로 승화</b>하면 오히려 무기가 됩니다 — 살(殺)은 없애는 게 아니라 다스리는 것입니다.</p>
    ${det.sinsal.length
      ? det.sinsal.map(name => {
          const info = SINSAL_INFO[name];
          const kindCls = info.kind === '길신' ? 'good' : info.kind === '흉살' ? 'bad' : '';
          return `<details class="god-deep">
            <summary><span class="gd-name">${name} <span class="gd-hanja">${info.hanja}</span></span>
              <span class="gd-cnt">${info.keyword}</span><span class="stage-badge ${kindCls==='good'?'strong':kindCls==='bad'?'weak':''}">${info.kind}</span></summary>
            <div class="gd-body">
              <p>${info.meaning}</p>
              <p><b class="gd-lab light">좋게 쓰면</b> ${info.good}</p>
              <p><b class="gd-lab shadow">과하면</b> ${info.bad}</p>
              <p><b class="gd-lab">해석 tip</b> ${info.advice}</p>
            </div>
          </details>`;
        }).join('')
      : '<p class="dim">도드라진 신살 없이 담백한 원국입니다 — 살(殺)에 흔들리지 않고 제 길을 가는 팔자입니다.</p>'}`;

  // 8) 대운
  if (det.daeun) {
    const age = new Date().getFullYear() - state.birth.y; // 세는나이 근사
    $('#saju-daeun').innerHTML = `
      <h3>대운(大運) — 10년마다 바뀌는 계절 <span class="dim">(${det.daeun.forward ? '순행' : '역행'} · ${det.daeun.startAge}세부터)</span></h3>
      <div class="daeun-scroll">${det.daeun.list.map(du => {
        const st = STEMS[du.stem], br = BRANCHES[du.branch];
        const current = age >= du.fromAge && age < du.fromAge + 10;
        return `<div class="daeun-card ${current ? 'now' : ''}">
          <div class="da-age">${du.fromAge}세${current ? ' · 지금' : ''}</div>
          <div class="da-glyph"><span class="el-${st.el}">${st.hanja}</span><span class="el-${br.el}">${br.hanja}</span></div>
          <div class="da-god">${du.god}</div>
          <div class="da-stage">${du.stage}</div>
        </div>`;
      }).join('')}</div>
      ${(() => {
        const cur = det.daeun.list.find(du => age >= du.fromAge && age < du.fromAge + 10);
        return cur ? `<p style="margin-top:12px"><b>지금의 대운 — ${STEMS[cur.stem].kr}${BRANCHES[cur.branch].kr} · ${cur.god}의 계절</b><br>${YEARLY_TEXT[cur.god].replace('해', '10년')} 십이운성 <b>${cur.stage}</b>의 흐름 위에 있습니다.</p>` : '';
      })()}`;
  } else {
    $('#saju-daeun').innerHTML = `
      <h3>대운(大運)</h3>
      <p class="dim">대운의 순행·역행은 성별에 따라 갈립니다. 문패에서 성별을 알려주시면 10년 단위의 큰 흐름을 세워드립니다.</p>
      <button class="ghost" id="btn-daeun-profile">문패 고치러 가기</button>`;
    $('#btn-daeun-profile').addEventListener('click', () => { pendingModule = 'saju'; fillProfileForm(); show('profile'); });
  }

  // 9) 올해의 세운
  const se = det.seun;
  $('#saju-seun').innerHTML = `
    <h3>올해의 세운(歲運) — ${se.year}년 ${STEMS[se.stem].kr}${BRANCHES[se.branch].kr}년</h3>
    <p><span class="keyword-chip">${se.god} ${TEN_GODS_10[se.god].hanja}</span><span class="keyword-chip">십이운성 ${se.stage}</span></p>
    <p style="margin-top:8px">${YEARLY_TEXT[se.god]}</p>`;
}
$('#btn-saju-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 점성 ----------
function renderAstro() {
  const z = state.zodiac, mp = state.moon;
  $('#astro-intro').innerHTML = themeIntroHTML('astro');
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
$('#btn-astro-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 관상 ----------
state.facePhoto = null;

function setupFaceCamera() {
  const video = $('#face-video'), photo = $('#face-photo'), empty = $('#face-empty');
  const bStart = $('#face-cam-start'), bShot = $('#face-cam-shot'), bRetake = $('#face-retake'), file = $('#face-file');
  const guide = $('#face-guide');

  function showLive() {
    CameraKit.stop.call(CameraKit); // 재진입 대비
  }
  function reset() {
    CameraKit.stop();
    video.hidden = true; photo.hidden = true; empty.hidden = false; guide.hidden = true;
    bStart.hidden = false; bShot.hidden = true; bRetake.hidden = true;
    bStart.textContent = '카메라 켜기';
  }
  function onPhoto(dataURL) {
    CameraKit.stop();
    state.facePhoto = dataURL;
    photo.src = dataURL; photo.hidden = false;
    video.hidden = true; empty.hidden = true; guide.hidden = true;
    bStart.hidden = true; bShot.hidden = true; bRetake.hidden = false;
    $('#face-tag-hint').hidden = false;
    $('#face-parts').style.display = '';
  }
  reset();

  bStart.onclick = async () => {
    if (!CameraKit.supported()) { alert('이 기기·브라우저에서는 카메라를 쓸 수 없습니다. "사진 올리기"를 이용해 주세요.'); return; }
    try {
      await CameraKit.start(video);
      video.hidden = false; empty.hidden = true; guide.hidden = false;
      bStart.hidden = true; bShot.hidden = false; bRetake.hidden = true;
    } catch (e) {
      alert('카메라를 열 수 없습니다(' + (e.name || '오류') + '). "사진 올리기"를 이용해 주세요.');
    }
  };
  bShot.onclick = () => { if (video.videoWidth) onPhoto(CameraKit.grab(video)); };
  bRetake.onclick = () => { state.facePhoto = null; photo.removeAttribute('src'); reset(); };
  file.onchange = (e) => { const f = e.target.files[0]; if (f) CameraKit.fileToDataURL(f, onPhoto); e.target.value = ''; };
}

function initFace() {
  state.face = {};
  state.facePhoto = null;
  state.done.face = false;
  $('#face-result').innerHTML = '';
  $('#face-tag-hint').hidden = true;
  $('#btn-face-back').style.display = 'none';
  $('#face-intro').innerHTML = themeIntroHTML('face');
  setupFaceCamera();
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
    if (Object.keys(state.face).length === FACE_PARTS.length) renderFaceResult();
  }));
}

function renderFaceResult() {
  state.done.face = true;
  $('#face-result').innerHTML = `<div class="panel" style="margin-top:18px">
    <h3>얼굴의 지도를 읽다</h3>
    ${state.facePhoto ? `<img class="result-photo" src="${state.facePhoto}" alt="관상 사진">` : ''}
    ${FACE_PARTS.map(part => {
      const sel = state.face[part.id];
      return `<p style="margin-bottom:10px"><b>${part.name}(${part.hanja})</b> · ${sel.label}<br>${sel.text}</p>`;
    }).join('')}
    <p class="dim">오관이 각기 맡은 시절 — 이마는 초년, 눈은 지금, 코는 중년, 입은 말년, 귀는 평생의 복을 비춥니다.</p>
  </div>`;
  $('#btn-face-back').style.display = 'block';
}
$('#btn-face-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 손금 ----------
const palm = { step: 0, strokes: [], drawing: false, points: [], photo: null };

function setupPalmCamera() {
  const video = $('#palm-video');
  const bStart = $('#palm-cam-start'), bShot = $('#palm-cam-shot'), bClear = $('#palm-clear-photo'), file = $('#palm-file');

  function usePhoto(dataURL) {
    CameraKit.stop();
    const img = new Image();
    img.onload = () => { palm.photo = img; drawPalmBase(); };
    img.src = dataURL;
    video.hidden = true;
    bStart.hidden = false; bStart.textContent = '손바닥 카메라 켜기'; bShot.hidden = true; bClear.hidden = false;
  }
  bStart.onclick = async () => {
    if (!CameraKit.supported()) { alert('이 기기·브라우저에서는 카메라를 쓸 수 없습니다. "손 사진 올리기"를 이용해 주세요.'); return; }
    try {
      await CameraKit.start(video);
      video.hidden = false;
      bStart.hidden = true; bShot.hidden = false;
    } catch (e) {
      alert('카메라를 열 수 없습니다(' + (e.name || '오류') + '). "손 사진 올리기"를 이용해 주세요.');
    }
  };
  bShot.onclick = () => { if (video.videoWidth) usePhoto(CameraKit.grab(video, 640)); };
  bClear.onclick = () => { palm.photo = null; bClear.hidden = true; drawPalmBase(); };
  file.onchange = (e) => { const f = e.target.files[0]; if (f) CameraKit.fileToDataURL(f, usePhoto); e.target.value = ''; };
}

function initPalm() {
  palm.step = 0; palm.strokes = []; palm.photo = null; state.palm = [];
  state.done.palm = false;
  $('#palm-result').innerHTML = '';
  $('#palm-video').hidden = true;
  $('#palm-cam-start').hidden = false; $('#palm-cam-start').textContent = '손바닥 카메라 켜기';
  $('#palm-cam-shot').hidden = true; $('#palm-clear-photo').hidden = true;
  $('#btn-palm-back').style.display = 'none';
  const c = $('#palm-canvas');
  c.width = 440; c.height = 520;
  $('#palm-intro').innerHTML = themeIntroHTML('palm');
  setupPalmCamera();
  drawPalmBase();
  updatePalmUI();
}

function drawPalmBase() {
  const c = $('#palm-canvas'), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  // 촬영한 손 사진을 배경으로 (있으면 실루엣 대신)
  if (palm.photo) {
    const img = palm.photo;
    const scale = Math.max(c.width / img.width, c.height / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(10,8,24,0.42)'; // 선이 잘 보이도록 살짝 어둡게
    ctx.fillRect(0, 0, c.width, c.height);
  } else {
  ctx.save();
  ctx.translate(220, 280);
  ctx.fillStyle = 'rgba(212,181,106,0.07)';
  ctx.strokeStyle = 'rgba(212,181,106,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-110, 180);
  ctx.bezierCurveTo(-150, 80, -140, -20, -100, -70);
  ctx.bezierCurveTo(-120, -110, -90, -135, -68, -105);
  ctx.lineTo(-60, -140); ctx.bezierCurveTo(-55, -175, -25, -175, -22, -140); ctx.lineTo(-20, -105);
  ctx.lineTo(-12, -150); ctx.bezierCurveTo(-6, -185, 24, -183, 26, -148); ctx.lineTo(24, -105);
  ctx.lineTo(34, -135); ctx.bezierCurveTo(42, -168, 70, -162, 68, -128); ctx.lineTo(62, -95);
  ctx.bezierCurveTo(95, -80, 105, -40, 100, 20);
  ctx.bezierCurveTo(98, 100, 60, 170, 0, 195);
  ctx.bezierCurveTo(-50, 205, -95, 200, -110, 180);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-100, -60);
  ctx.bezierCurveTo(-160, -70, -185, -30, -170, 5);
  ctx.bezierCurveTo(-160, 35, -130, 55, -105, 60);
  ctx.strokeStyle = 'rgba(212,181,106,0.25)';
  ctx.stroke();
  ctx.restore();
  }

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
  $('#btn-palm-redo').style.display = palm.step > 0 && !done ? 'inline-block' : 'none';
  if (done) renderPalmResult();
}

function renderPalmResult() {
  state.done.palm = true;
  const snapshot = $('#palm-canvas').toDataURL('image/jpeg', 0.8);
  $('#palm-result').innerHTML = `<div class="panel" style="margin-top:18px">
    <h3>세 갈래 강을 읽다</h3>
    <img class="result-photo" src="${snapshot}" alt="손금 도해">
    ${state.palm.map(p => `
      <p style="margin-bottom:10px"><b style="color:${p.line.color}">${p.line.name}</b><br>
      ${p.result.lengthText}<br>${p.result.shapeText}</p>`).join('')}
  </div>`;
  $('#btn-palm-back').style.display = 'block';
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
    if (!stroke) { drawPalmBase(); return; }
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
$('#btn-palm-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 주역 ----------
const iching = { lines: [], rng: null };

function initIching() {
  iching.lines = [];
  state.done.iching = false;
  iching.rng = seededRandom((state.seed || 'guest') + ':iching:' + Date.now());
  $('#iching-intro').innerHTML = themeIntroHTML('iching');
  $('#hex-lines').innerHTML = '';
  $('#iching-result').innerHTML = '';
  $('#btn-cast').style.display = 'block';
  $('#btn-cast').disabled = false;
  $('#btn-iching-back').style.display = 'none';
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
  state.done.iching = true;
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
  $('#btn-iching-back').style.display = 'block';
}
$('#btn-iching-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 타로 ----------
const tarot = { order: [], picked: 0, rng: null };
const TAROT_SLOTS = ['지나온 길', '지금 여기', '다가올 길'];

function initTarot() {
  state.tarot = [];
  state.done.tarot = false;
  tarot.picked = 0;
  tarot.rng = seededRandom((state.seed || 'guest') + ':tarot:' + Date.now());
  $('#tarot-intro').innerHTML = themeIntroHTML('tarot');
  tarot.order = TAROT.map((_, i) => i);
  for (let i = tarot.order.length - 1; i > 0; i--) {
    const j = Math.floor(tarot.rng() * (i + 1));
    [tarot.order[i], tarot.order[j]] = [tarot.order[j], tarot.order[i]];
  }
  $('#tarot-picked').innerHTML = '';
  $('#tarot-result').innerHTML = '';
  $('#btn-tarot-back').style.display = 'none';
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
    state.done.tarot = true;
    $('#tarot-guide').textContent = '세 장의 길이 정해졌습니다.';
    $('#tarot-result').innerHTML = `<div class="panel" style="margin-top:18px">
      <h3>세 장의 길을 읽다</h3>
      ${state.tarot.map((c, i) => {
        const cd = TAROT[c.n];
        return `<p style="margin-bottom:10px"><b>${TAROT_SLOTS[i]} · ${cd.icon} ${cd.name}${c.reversed ? ' (역방향)' : ''}</b><br>${c.reversed ? cd.rev : cd.up}</p>`;
      }).join('')}
    </div>`;
    $('#btn-tarot-back').style.display = 'block';
  }
}
$('#btn-tarot-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 직조실 (보너스) ----------
function buildReport() {
  state.fusion = fuseElements(state);
  const frng = seededRandom(state.seed + ':fable');
  state.fable = generateFable(state, state.fusion, frng);

  const f = state.fusion;
  const strong = ELEMENT_INFO[f.strongest], weak = ELEMENT_INFO[f.weakest];
  const maxScore = Math.max(...ELEMENTS.map(el => f.score[el]), 1);

  $('#report-fusion').innerHTML = `
    <h3>여섯 문에서 모은 기운의 직조</h3>
    <div class="el-bars">${ELEMENTS.map(el => `
      <div class="el-bar-row">
        <span class="el-name el-${el}">${el} ${ELEMENT_INFO[el].hanja}</span>
        <div class="el-bar-track"><div class="el-bar-fill" style="width:${(f.score[el] / maxScore) * 100}%;background:${ELEMENT_INFO[el].color}"></div></div>
        <span class="dim">${f.score[el]}</span></div>`).join('')}
    </div>
    <p style="margin-top:12px"><b class="el-${f.strongest}">주(主) 기운 — ${f.strongest}(${strong.hanja})</b><br>${strong.strongText}</p>
    <p style="margin-top:10px"><b class="el-${f.weakest}">보(補) 기운 — ${f.weakest}(${weak.hanja})</b><br>${weak.weakText}</p>`;

  $('#report-lucky').innerHTML = `
    <h3>운을 여는 열쇠 (부족한 ${f.weakest} 기운 보완)</h3>
    <div class="lucky-grid">
      <div class="lucky-item"><div class="lk">행운의 색</div><div class="lv">${weak.hex}</div></div>
      <div class="lucky-item"><div class="lk">행운의 방위</div><div class="lv">${weak.dir}</div></div>
      <div class="lucky-item"><div class="lk">행운의 숫자</div><div class="lv">${weak.nums.join(' · ')}</div></div>
      <div class="lucky-item"><div class="lk">힘이 되는 계절</div><div class="lv">${weak.season}</div></div>
      <div class="lucky-item"><div class="lk">기를 덕목</div><div class="lv">${weak.virtue.split('·')[0]}</div></div>
    </div>`;

  $('#report-fable').innerHTML = `
    <h3>${state.name}님의 운명 우화 ${state.fable.title}</h3>
    ${state.fable.paragraphs.map(p => `<p>${p}</p>`).join('')}`;

  const sc = $('#sigil-canvas');
  sc.width = 640; sc.height = 640;
  drawSigil(sc, state, state.fusion, state.seed);

  const rs = $('#report-share');
  if (rs) mountShareBar('#report-share', shareSession);

  show('report');
}

$('#btn-save-sigil').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `칠문_운명문장_${state.name}.png`;
  a.href = $('#sigil-canvas').toDataURL('image/png');
  a.click();
});
$('#btn-report-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 궁합 ----------
function readPersonForm(pre) {
  const birth = $(`#${pre}-birth`).value;
  const unknown = $(`#${pre}-unknown`).checked;
  const time = $(`#${pre}-time`).value;
  if (!birth) return { error: '생년월일을 입력해 주세요.' };
  if (!unknown && !time) return { error: '태어난 시각을 고르거나 "시간 모름"에 표시해 주세요.' };
  const [y, m, d] = birth.split('-').map(Number);
  if (y < 1900 || y > 2100) return { error: '1900~2100년 사이만 볼 수 있습니다.' };
  let hh = 12, mm = 0;
  if (!unknown) [hh, mm] = time.split(':').map(Number);
  return { name: $(`#${pre}-name`).value.trim(), y, m, d, hh, mm, unknown };
}

function initGunghap() {
  $('#gunghap-intro').innerHTML = themeIntroHTML('gunghap');
  $('#gunghap-result').innerHTML = '';
  $('#gunghap-form').style.display = '';
  $('#btn-gunghap-back').style.display = 'none';
  // 프로필 있으면 '나'에 프리필
  if (state.birth) {
    $('#gh-a-name').value = state.name === '나그네' ? '' : state.name;
    $('#gh-a-birth').value = `${state.birth.y}-${String(state.birth.m).padStart(2,'0')}-${String(state.birth.d).padStart(2,'0')}`;
    if (!state.hourUnknown && state.time) $('#gh-a-time').value = `${String(state.time.hh).padStart(2,'0')}:${String(state.time.mm).padStart(2,'0')}`;
    $('#gh-a-unknown').checked = state.hourUnknown;
    $('#gh-a-time').disabled = state.hourUnknown;
  }
}
$('#gh-a-unknown').addEventListener('change', e => { $('#gh-a-time').disabled = e.target.checked; });
$('#gh-b-unknown').addEventListener('change', e => { $('#gh-b-time').disabled = e.target.checked; });

$('#gh-go').addEventListener('click', () => {
  const A = readPersonForm('gh-a'), B = readPersonForm('gh-b');
  if (A.error) { alert('나: ' + A.error); return; }
  if (B.error) { alert('상대: ' + B.error); return; }
  const sajuA = calcSaju(A.y, A.m, A.d, A.hh, A.mm, A.unknown);
  const sajuB = calcSaju(B.y, B.m, B.d, B.hh, B.mm, B.unknown);
  const g = calcGunghap(sajuA, sajuB);
  state.gunghap = { A, B, result: g };
  renderGunghap();
});

function renderGunghap() {
  const { A, B, result: g } = state.gunghap;
  const nameA = A.name || '나', nameB = B.name || '상대';
  const relClass = (rel) => rel.good === true ? 'good' : rel.good === false ? 'bad' : '';
  $('#gunghap-form').style.display = 'none';
  $('#gunghap-result').innerHTML = `
    <div class="gh-score-card">
      <div class="gh-names">${nameA} <span class="gh-x">×</span> ${nameB}</div>
      <div class="gh-ring" style="--pct:${g.score}">
        <div class="gh-ring-inner"><span class="gh-num">${g.score}</span><span class="gh-unit">점</span></div>
      </div>
      <div class="gh-grade">${g.grade.title}</div>
      <p class="gh-grade-text">${g.grade.text}</p>
    </div>

    <div class="panel">
      <h3>서로를 어떻게 느끼는가 — 일간 십신</h3>
      <p><b>${nameA} → ${nameB}</b> : ${g.aToB}(${TEN_GODS_10[g.aToB].hanja})<br>${g.aRole}</p>
      <p style="margin-top:10px"><b>${nameB} → ${nameA}</b> : ${g.bToA}(${TEN_GODS_10[g.bToA].hanja})<br>${g.bRole}</p>
    </div>

    <div class="panel">
      <h3>두 기운은 당기는가, 부딪는가 — 합충(合冲)</h3>
      <p><span class="gh-rel ${relClass(g.relYear)}">띠 · ${g.relYear.a}띠 ↔ ${g.relYear.b}띠 : ${g.relYear.tag}</span><br>${g.relYear.text}</p>
      <p style="margin-top:10px"><span class="gh-rel ${relClass(g.relDay)}">배우자궁(일지) : ${g.relDay.tag}</span><br>${g.relDay.text}</p>
      <p style="margin-top:10px" class="dim">일간 오행 — ${g.dayHarmonyText}</p>
    </div>

    <div class="panel">
      <h3>합치면 오행이 고른가 — 상보(相補)</h3>
      <div class="el-bars">${ELEMENTS.map(el => {
        const n = g.merged[el], max = Math.max(...ELEMENTS.map(e=>g.merged[e]),1);
        return `<div class="el-bar-row"><span class="el-name el-${el}">${el} ${ELEMENT_INFO[el].hanja}</span>
          <div class="el-bar-track"><div class="el-bar-fill" style="width:${n/max*100}%;background:${ELEMENT_INFO[el].color}"></div></div>
          <span class="dim">${n}</span></div>`;
      }).join('')}</div>
      <p style="margin-top:10px">두 사람의 오행을 합친 그림입니다. 고르게 퍼질수록 서로의 부족한 기운을 채워 주는 관계 — 균형도 <b>${Math.round(g.balanceScore*100)}%</b>.</p>
    </div>

    <div class="share-bar" id="gh-share"></div>
    <p class="disclaimer" style="text-align:center">※ 궁합은 참고용 이야기입니다. 두 사람의 마음과 노력이 언제나 사주를 이깁니다.</p>`;
  mountShareBar('#gh-share', () => shareGunghap());
  $('#btn-gunghap-back').style.display = 'block';
}
$('#btn-gunghap-back').addEventListener('click', () => { renderHub(); show('intro'); });

// ---------- 결과 저장 · 공유 ----------
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (_) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  }
}
// 전체 세션을 URL 해시로 직렬화 (사주·점성은 생일에서 재계산, 나머지는 선택 저장)
function encodeSession() {
  const s = {
    n: state.name, b: state.birth, t: state.time, hu: state.hourUnknown, g: state.gender,
    f: Object.fromEntries(FACE_PARTS.map(p => [p.id, state.face[p.id] ? p.options.indexOf(state.face[p.id]) : null]).filter(e => e[1] !== null)),
    pa: state.palm.map(p => [PALM_LINES.indexOf(p.line), p.result.isLong ? 1 : 0, p.result.isCurvy ? 1 : 0]),
    ic: state.iching ? state.iching.lines.map(l => (l.yang ? 1 : 0) * 1 + (l.changing ? 2 : 0)) : null,
    ta: state.tarot.map(c => [c.n, c.reversed ? 1 : 0]),
    gh: state.gunghap ? { A: state.gunghap.A, B: state.gunghap.B } : null,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function shareSession() {
  const url = location.origin + location.pathname + '#s=' + encodeSession();
  copyText(url).then(ok => toast(ok ? '공유 링크를 복사했습니다 🔗' : '복사 실패 — 주소창을 직접 복사해 주세요'));
}
function shareGunghap() {
  if (!state.gunghap) return;
  const g = { A: state.gunghap.A, B: state.gunghap.B };
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify({ gh: g })))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const url = location.origin + location.pathname + '#s=' + enc;
  copyText(url).then(ok => toast(ok ? '궁합 링크를 복사했습니다 🔗' : '복사 실패'));
}
function mountShareBar(sel, shareFn) {
  const el = $(sel); if (!el) return;
  el.innerHTML = `<button class="ghost sb">🔗 결과 링크 복사</button>`;
  el.querySelector('.sb').addEventListener('click', shareFn);
}
function decodeSession(hash) {
  try {
    const raw = hash.replace(/^#s=/, '').replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  } catch (_) { return null; }
}
function restoreSession(d) {
  if (d.b) {
    state.name = d.n || '나그네'; state.birth = d.b; state.time = d.t; state.hourUnknown = d.hu; state.gender = d.g || '';
    state.seed = `${state.name}|${d.b.y}-${d.b.m}-${d.b.d}|${d.hu?'x':(d.t?d.t.hh+':'+d.t.mm:'')}|${state.gender}`;
    state.saju = calcSaju(d.b.y, d.b.m, d.b.d, d.t?d.t.hh:12, d.t?d.t.mm:0, d.hu);
    state.sajuDetail = calcSajuDetail(state.saju, state.birth, state.gender);
    state.zodiac = calcZodiac(d.b.m, d.b.d); state.moon = calcMoonPhase(d.b.y, d.b.m, d.b.d);
    state.done.saju = true; state.done.astro = true;
  }
  if (d.f) for (const [pid, idx] of Object.entries(d.f)) { const p = FACE_PARTS.find(x=>x.id===pid); if (p&&p.options[idx]){ state.face[pid]=p.options[idx]; state.done.face=true; } }
  if (d.pa && d.pa.length) { state.palm = d.pa.map(([li,lng,cv]) => { const line=PALM_LINES[li]; return { line, result:{ isLong:!!lng, isCurvy:!!cv, lengthText: lng?line.long:line.short, shapeText: cv?line.curvy:line.straight } }; }); state.done.palm = true; }
  if (d.ic) { const lines = d.ic.map(v => ({ yang: (v&1)===1, changing: v>=2 })); state.iching = { ...resolveCasting(lines), lines }; state.done.iching = true; }
  if (d.ta && d.ta.length) { state.tarot = d.ta.map(([n,r]) => ({ n, reversed: !!r })); state.done.tarot = true; }
  if (d.gh) {
    const sA = calcSaju(d.gh.A.y,d.gh.A.m,d.gh.A.d,d.gh.A.hh,d.gh.A.mm,d.gh.A.unknown);
    const sB = calcSaju(d.gh.B.y,d.gh.B.m,d.gh.B.d,d.gh.B.hh,d.gh.B.mm,d.gh.B.unknown);
    state.gunghap = { A: d.gh.A, B: d.gh.B, result: calcGunghap(sA, sB) };
  }
}

// 콘텐츠가 원격에서 갱신되면 현재 화면 다시 그리기
window.onContentRefreshed = () => { try { renderHub(); } catch (_) {} };

// ---------- 시작 ----------
(function boot() {
  const hash = location.hash;
  if (hash.startsWith('#s=')) {
    const d = decodeSession(hash);
    if (d) {
      restoreSession(d);
      renderHub();
      history.replaceState(null, '', location.pathname);
      if (d.gh && !d.b) { initGunghap(); renderGunghap(); show('gunghap'); toast('공유된 궁합을 불러왔습니다'); return; }
      toast('공유된 결과를 불러왔습니다 — 대문에서 확인하세요');
      show('intro');
      return;
    }
  }
  renderHub();
})();
