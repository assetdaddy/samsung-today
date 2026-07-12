/* ============================================================
   칠문(七門) — 콘텐츠 DB 계층
   ------------------------------------------------------------
   data.js 의 "풀이 텍스트"를 담당자가 편집/내보내기/불러오기 할 수 있도록
   하는 오버라이드 레이어. 규칙(계산 로직)은 건드리지 않고, 사람이 읽는
   문장(콘텐츠)만 관리 대상으로 노출한다.
   admin.html 과 app.js 양쪽에서 함께 로드된다.
   ============================================================ */

const CONTENT_DB_KEY = 'chilmun_content_overrides_v1';

function _entries(ref) {
  return Array.isArray(ref)
    ? ref.map((o, i) => ({ id: String(i), obj: o }))
    : Object.keys(ref).map(k => ({ id: k, obj: ref[k] }));
}

// 편집 가능한 콘텐츠 테이블 정의.
// 각 테이블은 rows()(현재 값 나열)와 set(id, field, value)(값 반영)을 제공한다.
function _objTable(key, label, refFn, nameFn, fieldDefs, opts = {}) {
  const self = !!opts.self; // 값이 문자열 그 자체인 맵(STAGE_TEXT 등)
  return {
    key, label,
    count: () => _entries(refFn()).length,
    rows() {
      const ref = refFn();
      return _entries(ref).map(e => ({
        id: e.id,
        name: nameFn(e),
        fields: fieldDefs.map(([f, fl]) => ({
          field: f, flabel: fl,
          value: self ? ref[e.id] : (e.obj[f] ?? ''),
        })),
      }));
    },
    set(id, field, value) {
      const ref = refFn();
      if (self) { ref[id] = value; return; }
      const e = _entries(ref).find(x => x.id === id);
      if (e) e.obj[field] = value;
    },
  };
}

const CONTENT_TABLES = [
  _objTable('element', '오행(五行)', () => ELEMENT_INFO,
    e => `${e.id} ${e.obj.hanja}`,
    [['virtue', '덕목·키워드'], ['strongText', '기운이 강할 때'], ['weakText', '기운을 보완하려면']]),

  _objTable('stem', '천간(天干) 10', () => STEMS,
    e => `${e.obj.kr}${e.obj.hanja} (${e.obj.el})`,
    [['image', '물상(物象)'], ['text', '일간 해석']]),

  _objTable('god', '십신(十神) 10종', () => TEN_GODS_10,
    e => `${e.id} ${e.obj.hanja}`,
    [['short', '한 줄 별칭'], ['text', '해석']]),

  _objTable('godgroup', '십신 계열 5', () => TEN_GODS,
    e => e.obj.name,
    [['desc', '정의'], ['text', '계열 해석']]),

  _objTable('sinsal', '신살(神殺)', () => SINSAL_INFO,
    e => `${e.id} ${e.obj.hanja}`,
    [['text', '해석']]),

  _objTable('stage', '십이운성(十二運星)', () => STAGE_TEXT,
    e => e.id,
    [['__self', '해석']], { self: true }),

  _objTable('zodiac', '별자리 12궁', () => ZODIAC,
    e => `${e.obj.symbol} ${e.obj.name}`,
    [['key', '키워드'], ['text', '해석']]),

  _objTable('moon', '달 위상 8', () => MOON_PHASES,
    e => `${e.obj.icon} ${e.obj.name}`,
    [['key', '키워드'], ['text', '해석']]),

  _objTable('hex', '주역 64괘', () => HEXAGRAMS,
    e => `${e.id}. ${e.obj.name} ${e.obj.hanja}`,
    [['key', '키워드'], ['text', '괘사(卦辭) 풀이']]),

  _objTable('tarot', '타로 22장', () => TAROT,
    e => `${e.obj.name} · ${e.obj.en}`,
    [['up', '정방향'], ['rev', '역방향']]),

  _objTable('yearly', '세운(歲運) 풀이', () => YEARLY_TEXT,
    e => e.id,
    [['__self', '해석']], { self: true }),

  // 관상 — 오관별 선택지(중첩 구조 → 평면 행)
  {
    key: 'face', label: '관상 오관(五官)',
    count: () => FACE_PARTS.reduce((n, p) => n + p.options.length, 0),
    rows() {
      const out = [];
      FACE_PARTS.forEach(part => part.options.forEach((o, i) => out.push({
        id: `${part.id}::${i}`,
        name: `${part.name}(${part.hanja}) · ${o.label}`,
        fields: [{ field: 'text', flabel: '해석', value: o.text }],
      })));
      return out;
    },
    set(id, field, value) {
      const [pid, idx] = id.split('::');
      const part = FACE_PARTS.find(p => p.id === pid);
      if (part && part.options[+idx]) part.options[+idx][field] = value;
    },
  },

  // 손금 — 3선 × 길이/모양 텍스트
  _objTable('palm', '손금 3선', () => PALM_LINES,
    e => e.obj.name,
    [['long', '길 때'], ['short', '짧을 때'], ['curvy', '곡선일 때'], ['straight', '직선일 때']]),
];

// ---------- 오버라이드 저장/적용 ----------
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(CONTENT_DB_KEY)) || {}; }
  catch (_) { return {}; }
}
function saveOverrides(ov) {
  localStorage.setItem(CONTENT_DB_KEY, JSON.stringify(ov));
}
function tableByKey(key) { return CONTENT_TABLES.find(t => t.key === key); }

// 저장된 오버라이드를 전역 data 객체에 반영 (앱/어드민 로드 시 1회)
function applyContentOverrides(ov = loadOverrides()) {
  let n = 0;
  for (const [tkey, rows] of Object.entries(ov)) {
    const t = tableByKey(tkey);
    if (!t) continue;
    for (const [id, fields] of Object.entries(rows)) {
      for (const [field, value] of Object.entries(fields)) { t.set(id, field, value); n++; }
    }
  }
  return n;
}

// 브라우저(앱)에서 즉시 반영
if (typeof window !== 'undefined') {
  try { applyContentOverrides(); } catch (_) { /* data.js 미로드 환경 무시 */ }
}
