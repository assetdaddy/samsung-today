/* ============================================================
   칠문(七門) — 운명 계산 엔진
   ============================================================ */

// ---------- 시드 난수 (결과 재현성) ----------
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandom(seedStr) { return mulberry32(xmur3(seedStr)()); }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// ---------- 한국어 조사 ----------
function hasBatchim(word) {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xAC00 || ch > 0xD7A3) return false;
  return (ch - 0xAC00) % 28 > 0;
}
function josa(word, pair) { // pair: '은/는' '이/가' '을/를' '과/와' '아/야'
  const [withB, withoutB] = pair.split('/');
  return word + (hasBatchim(word) ? withB : withoutB);
}

// ---------- 사주 만세력 ----------
// 1900-01-01 = 갑술일(甲戌, index 10) 기준 / 검산: 1949-10-01 = 갑자일
function daysSinceEpoch(y, m, d) {
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(1900, 0, 1);
  return Math.round((a - b) / 86400000);
}

// 절기(월 경계) 근사: [월, 절입일] — 이 날짜부터 해당 지지의 달
const TERM_DAYS = { 1: 6, 2: 4, 3: 6, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7 };
// 각 절기 이후의 월지 index (BRANCHES 기준): 1월 소한→축(1), 2월 입춘→인(2) ...
const MONTH_BRANCH_AFTER_TERM = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 0 };

function calcSaju(y, m, d, hour, minute, hourUnknown) {
  // 연주: 입춘(2/4 근사) 기준
  let sajuYear = y;
  if (m < 2 || (m === 2 && d < TERM_DAYS[2])) sajuYear = y - 1;
  const yStem = ((sajuYear - 4) % 10 + 10) % 10;
  const yBranch = ((sajuYear - 4) % 12 + 12) % 12;

  // 월주: 절기 기준 월지
  let mBranch;
  if (d >= TERM_DAYS[m]) mBranch = MONTH_BRANCH_AFTER_TERM[m];
  else mBranch = MONTH_BRANCH_AFTER_TERM[m === 1 ? 12 : m - 1];
  // 오호둔: 연간에 따른 인월(寅月) 천간 — 갑기→병, 을경→무, 병신→경, 정임→임, 무계→갑
  const inMonthStemStart = [2, 4, 6, 8, 0][yStem % 5];
  const offsetFromIn = ((mBranch - 2) % 12 + 12) % 12;
  const mStem = (inMonthStemStart + offsetFromIn) % 10;

  // 일주: 1900-01-01 = index 10 (갑술)
  let days = daysSinceEpoch(y, m, d);
  // 자시(23시~)는 다음 날 일주로 넘김
  if (!hourUnknown && hour >= 23) days += 1;
  const dayIdx = ((days + 10) % 60 + 60) % 60;
  const dStem = dayIdx % 10;
  const dBranch = dayIdx % 12;

  // 시주
  let pillars;
  if (hourUnknown) {
    pillars = { year: [yStem, yBranch], month: [mStem, mBranch], day: [dStem, dBranch], hour: null };
  } else {
    const hBranch = Math.floor(((hour + 1) % 24) / 2);
    const hStemStart = (dStem % 5) * 2; // 갑기일→갑자시 ...
    const hStem = (hStemStart + hBranch) % 10;
    pillars = { year: [yStem, yBranch], month: [mStem, mBranch], day: [dStem, dBranch], hour: [hStem, hBranch] };
  }

  // 오행 분포
  const elCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p) continue;
    elCount[STEMS[p[0]].el]++;
    elCount[BRANCHES[p[1]].el]++;
  }

  // 십신 분포 (일간 기준, 일간 제외 글자들)
  const me = STEMS[dStem].el;
  const gods = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const rel = (el) => {
    if (el === me) return '비겁';
    if (GENERATES[me] === el) return '식상';
    if (CONTROLS[me] === el) return '재성';
    if (CONTROLS[el] === me) return '관성';
    return '인성';
  };
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p) continue;
    if (key !== 'day') gods[rel(STEMS[p[0]].el)]++;
    gods[rel(BRANCHES[p[1]].el)]++;
  }

  return { pillars, elCount, gods, dayStem: dStem, zodiacAnimal: BRANCHES[yBranch].animal };
}

// ---------- 서양 점성 ----------
function calcZodiac(m, d) {
  for (const z of ZODIAC) {
    const [fm, fd] = z.from, [tm, td] = z.to;
    if (fm === 12) { // 염소자리 (연말 걸침)
      if ((m === 12 && d >= fd) || (m === 1 && d <= td)) return z;
    } else if ((m === fm && d >= fd) || (m === tm && d <= td)) return z;
  }
  return ZODIAC[0];
}

// 달 위상: 2000-01-06 18:14 UTC 신월 기준, 삭망월 29.530588일
function calcMoonPhase(y, m, d) {
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const t = Date.UTC(y, m - 1, d, 12, 0);
  const synodic = 29.530588853;
  let age = ((t - known) / 86400000) % synodic;
  if (age < 0) age += synodic;
  const idx = Math.floor(((age + synodic / 16) / synodic) * 8) % 8;
  return { phase: MOON_PHASES[idx], age: Math.round(age * 10) / 10 };
}

// ---------- 주역 ----------
// 동전 3닢: 앞(3)/뒤(2) 합 → 6 노음(변) 7 소양 8 소음 9 노양(변)
function castLine(rng) {
  let sum = 0;
  const coins = [];
  for (let i = 0; i < 3; i++) {
    const head = rng() < 0.5;
    coins.push(head);
    sum += head ? 3 : 2;
  }
  return { sum, coins, yang: sum % 2 === 1, changing: sum === 6 || sum === 9 };
}

function linesToHexagram(lines) { // lines: [{yang}...] 아래→위
  const bits = lines.map(l => (l.yang ? '1' : '0'));
  const lower = bits.slice(0, 3).join('');
  const upper = bits.slice(3, 6).join('');
  const num = HEX_TABLE[lower][upper];
  return { num, lower: TRIGRAMS[lower], upper: TRIGRAMS[upper], info: HEXAGRAMS[num] };
}

function resolveCasting(lines) {
  const primary = linesToHexagram(lines);
  const hasChanging = lines.some(l => l.changing);
  let changed = null;
  if (hasChanging) {
    const flipped = lines.map(l => ({ yang: l.changing ? !l.yang : l.yang }));
    changed = linesToHexagram(flipped);
  }
  return { primary, changed, changingCount: lines.filter(l => l.changing).length };
}

// ---------- 손금 분석 ----------
function analyzePalmStroke(points) {
  if (!points || points.length < 8) return null;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const chord = Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y);
  const curviness = chord > 0 ? len / chord : 1; // 1에 가까울수록 직선
  return { len, chord, curviness };
}

function interpretPalm(lineData, stroke, canvasSize) {
  const norm = stroke.len / canvasSize; // 캔버스 대각선 대비 길이
  const isLong = norm > 0.52;
  const isCurvy = stroke.curviness > 1.13;
  return {
    lengthText: isLong ? lineData.long : lineData.short,
    shapeText: isCurvy ? lineData.curvy : lineData.straight,
    isLong, isCurvy,
  };
}

// ---------- 오행 융합 ----------
function fuseElements(state) {
  const score = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  // 1) 사주 (가중치 큼)
  for (const el of ELEMENTS) score[el] += state.saju.elCount[el] * 2;
  // 2) 별자리
  score[state.zodiac.wel] += 2;
  // 3) 관상
  for (const sel of Object.values(state.face)) score[sel.el] += 1;
  // 4) 손금 (길게 그린 선의 오행 강화)
  for (const p of state.palm) if (p.result.isLong) score[p.line.el] += 1;
  // 5) 주역 (상·하괘 오행)
  score[state.iching.primary.upper.el] += 1;
  score[state.iching.primary.lower.el] += 1;
  // 6) 타로 (정방향 카드의 오행)
  for (const c of state.tarot) if (!c.reversed) score[TAROT[c.n].el] += 1;

  const entries = ELEMENTS.map(el => [el, score[el]]);
  entries.sort((a, b) => b[1] - a[1]);
  return { score, strongest: entries[0][0], weakest: entries[entries.length - 1][0] };
}

// ---------- 우화 생성 ----------
function generateFable(state, fusion, rng) {
  const animal = state.saju.zodiacAnimal;
  const trait = ANIMAL_TRAITS[animal];
  const stem = STEMS[state.saju.dayStem];
  const setting = pick(rng, FABLE_SETTINGS[state.zodiac.el]);
  const hx = state.iching.primary.info;
  const presentCard = state.tarot[1];
  const cardInfo = TAROT[presentCard.n];
  const strong = ELEMENT_INFO[fusion.strongest];
  const weak = ELEMENT_INFO[fusion.weakest];
  const moon = state.moon.phase;

  const heroName = `${trait} ${animal}`;
  const aTopic = josa(animal, '은/는'); // 은/는
  const p1 = `${pick(rng, FABLE_OPENINGS)} ${josa(setting, '이/가')} 있었습니다. 그곳에 ${heroName} 한 마리가 살았지요. ` +
    `사람들은 몰랐지만, 그 ${animal}의 심장에는 ${stem.image}(${stem.hanja})의 불씨가 깃들어 있었습니다.`;
  const p2 = `어느 날 하늘이 ${animal}에게 수수께끼 하나를 내렸습니다. 그것은 「${hx.name}(${hx.hanja})」 — ${hx.key}의 수수께끼였습니다. ` +
    pick(rng, [
      `${aTopic} 몇 밤을 지새우며 그 뜻을 곱씹었습니다.`,
      `${aTopic} 도망치는 대신, 수수께끼의 한가운데로 걸어 들어갔습니다.`,
      `${aTopic} 그 물음을 등에 지고 길을 떠났습니다.`,
    ]);
  const p3 = `길 위에서 ${aTopic} 「${cardInfo.name}」의 정령을 만났습니다. 정령은 ${cardInfo.icon} 표식을 남기며 이렇게 속삭였습니다. ` +
    `"${presentCard.reversed ? cardInfo.rev : cardInfo.up}"`;
  const p4 = `그 말을 품고 마지막 고개를 넘던 밤, 하늘에는 ${moon.icon} ${josa(moon.name.replace(/\(.*\)/, ''), '이/가')} 떠 있었습니다. ` +
    `그때 ${animal}의 안에서 ${strong.hanja}(${fusion.strongest})의 기운이 강물처럼 차올랐고, ${aTopic} 마침내 수수께끼의 답이 처음부터 자기 안에 있었음을 알았습니다.`;
  const p5 = `다만 산을 내려오며 ${aTopic} 작은 주머니 하나를 챙겼습니다. 주머니에는 ${weak.hanja}(${fusion.weakest})의 씨앗 — ` +
    `아직 자신에게 부족한 ${weak.virtue.split('·')[1] || weak.virtue}의 씨앗이 들어 있었지요. 위대한 이야기는 언제나, 채워진 것이 아니라 채워갈 것에서 시작되니까요.`;
  const p6 = pick(rng, FABLE_MORAL_TAIL);

  return {
    title: `「${josa(heroName, '과/와')} ${hx.key}의 수수께끼」`,
    paragraphs: [p1, p2, p3, p4, p5, p6],
  };
}

// ---------- 운명 문장(紋章) 렌더러 ----------
function drawSigil(canvas, state, fusion, seedStr) {
  const rng = seededRandom(seedStr + ':sigil');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.42;

  // 배경
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35);
  bg.addColorStop(0, '#1a1530');
  bg.addColorStop(1, '#0a0818');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 별가루
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.35})`;
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, rng() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(cx, cy);

  // 외곽 이중 링 + 12궁 눈금
  ctx.strokeStyle = 'rgba(212,181,106,0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.94, 0, Math.PI * 2); ctx.stroke();

  const zIdx = ZODIAC.indexOf(state.zodiac);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const mine = i === zIdx;
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = mine ? '#ffd97a' : 'rgba(212,181,106,0.55)';
    ctx.lineWidth = mine ? 2.4 : 1;
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(0, -R * (mine ? 0.86 : 0.94));
    ctx.stroke();
    if (mine) {
      ctx.fillStyle = '#ffd97a';
      ctx.font = `${R * 0.13}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(state.zodiac.symbol, 0, -R * 1.09);
    }
    ctx.restore();
  }

  // 오행 오각형 (기운 세기에 따른 반지름)
  const maxScore = Math.max(...ELEMENTS.map(el => fusion.score[el]), 1);
  ctx.beginPath();
  ELEMENTS.forEach((el, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const r = R * 0.28 + (fusion.score[el] / maxScore) * R * 0.5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(140,110,220,0.14)';
  ctx.strokeStyle = 'rgba(170,140,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.fill(); ctx.stroke();

  // 오행 꼭짓점 구슬 + 한자
  ELEMENTS.forEach((el, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const r = R * 0.28 + (fusion.score[el] / maxScore) * R * 0.5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    ctx.fillStyle = ELEMENT_INFO[el].color;
    ctx.beginPath(); ctx.arc(x, y, el === fusion.strongest ? 6 : 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${R * 0.09}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ELEMENT_INFO[el].hanja, Math.cos(a) * (r + R * 0.12), Math.sin(a) * (r + R * 0.12) + R * 0.03);
  });

  // 중앙 육효 (주역괘)
  const lines = state.iching.lines;
  const lw = R * 0.3, lh = R * 0.035, gap = R * 0.085;
  lines.forEach((l, i) => {
    const y = (2.5 - i) * gap; // 아래 효부터 위로
    ctx.fillStyle = l.changing ? '#ffd97a' : 'rgba(230,225,255,0.9)';
    if (l.yang) {
      ctx.fillRect(-lw / 2, y - lh / 2, lw, lh);
    } else {
      ctx.fillRect(-lw / 2, y - lh / 2, lw * 0.42, lh);
      ctx.fillRect(lw / 2 - lw * 0.42, y - lh / 2, lw * 0.42, lh);
    }
  });

  // 타로 3장의 별 표식
  state.tarot.forEach((c, i) => {
    const a = ((i - 1) / 3) * Math.PI * 1.15 + Math.PI / 2;
    const x = Math.cos(a) * R * 0.72, y = Math.sin(a) * R * 0.72;
    drawStar(ctx, x, y, 5, R * 0.045, R * 0.02, c.reversed ? 'rgba(224,90,78,0.9)' : 'rgba(255,217,122,0.95)');
  });

  // 달 위상 점
  const moonIdx = MOON_PHASES.indexOf(state.moon.phase);
  const ma = (moonIdx / 8) * Math.PI * 2 - Math.PI / 2;
  ctx.fillStyle = '#cfd8ff';
  ctx.beginPath();
  ctx.arc(Math.cos(ma) * R * 0.94, Math.sin(ma) * R * 0.94, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 하단 명문
  ctx.fillStyle = 'rgba(212,181,106,0.95)';
  ctx.font = `${Math.round(W * 0.035)}px serif`;
  ctx.textAlign = 'center';
  const stem = STEMS[state.saju.dayStem];
  ctx.fillText(`${state.name || '無名'} · ${stem.kr}${stem.hanja} 일간 · ${state.iching.primary.info.name}`, cx, H - W * 0.045);
}

function drawStar(ctx, x, y, spikes, outerR, innerR, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
