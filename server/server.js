#!/usr/bin/env node
/* ============================================================
   칠문 — 콘텐츠 DB 예제 서버 (의존성 0, Node 내장 모듈만)
   ------------------------------------------------------------
   풀이 텍스트 오버라이드(JSON)를 파일에 보관하는 최소 REST 서버.
   운영자 콘솔(admin.html)의 "DB 연동"에서 이 서버를 가리키면
   여러 담당자가 같은 콘텐츠를 공유·편집할 수 있습니다.

   실행:   node server/server.js
   환경변수:
     PORT       (기본 8787)
     DATA_FILE  (기본 server/overrides.json)
     API_TOKEN  (설정 시 Authorization: Bearer <token> 필요)

   엔드포인트:
     GET  /overrides   → 저장된 오버라이드 JSON 반환
     PUT  /overrides   → 본문(JSON)으로 통째 저장
   (CORS 허용 — 정적 호스팅된 admin.html에서 바로 호출 가능)
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'overrides.json');
const API_TOKEN = process.env.API_TOKEN || '';

function readData() {
  try { return fs.readFileSync(DATA_FILE, 'utf8'); }
  catch (_) { return '{}'; }
}
function writeData(str) {
  fs.writeFileSync(DATA_FILE, str);
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
function authed(req) {
  if (!API_TOKEN) return true;
  const h = req.headers['authorization'] || '';
  return h === 'Bearer ' + API_TOKEN;
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = req.url.split('?')[0];
  if (url !== '/overrides') { res.writeHead(404); return res.end('Not found'); }
  if (!authed(req)) { res.writeHead(401); return res.end('Unauthorized'); }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(readData());
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try {
        JSON.parse(body); // 유효성 검사
        writeData(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"ok":false,"error":"invalid JSON"}');
      }
    });
    return;
  }
  res.writeHead(405); res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`칠문 콘텐츠 DB 서버 → http://localhost:${PORT}/overrides`);
  console.log(`저장 파일: ${DATA_FILE}${API_TOKEN ? ' · 토큰 보호 ON' : ''}`);
});
