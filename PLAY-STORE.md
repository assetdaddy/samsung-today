# 구글 플레이 스토어 출시 가이드 📱

칠문을 **사주·타로 분석가용 유료 앱**으로 Google Play에 올리는 전체 절차입니다.
개발자 계정: **Quantistlee@gmail.com**

준비된 것(이 저장소에 포함):
- ✅ 앱 본체(PWA) + Capacitor 설정(`capacitor.config.json`, `package.json`)
- ✅ 앱 아이콘 `icons/`, 스토어 그래픽 `store/graphics/`, 스크린샷 `store/screenshots/`
- ✅ 개인정보처리방침 `privacy-policy.html` (카메라 사용 고지 포함 — Play 필수)
- ✅ 스토어 문안 `store/store-listing.md`

회원님이 직접 하셔야 하는 것: 개발자 등록·서명키·콘솔 업로드(아래).

---

## 0. 사전 준비 (한 번만)

1. **Google Play 개발자 계정** 생성 — https://play.google.com/console
   - Quantistlee@gmail.com 로그인 → 등록비 **US$25(1회)** 결제.
   - 신원 확인(며칠 소요될 수 있음).
2. **유료 판매 시**: Play Console → 결제 프로필(판매자/Merchant 계정) 설정.
3. 개발 PC에 **Android Studio** 설치 (Node 18+ 포함).

---

## 1. 네이티브 프로젝트 생성 (PC에서)

```bash
# 저장소 클론 후 루트에서
npm install
npm run cap:add:android      # android/ 프로젝트 생성
npm run cap:sync             # 웹 자산 복사
```

앱 아이콘 자동 주입(권장):
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0a0818' --iconForegroundColor '#ffd97a'
# 또는 icons/icon-512.png 를 소스로 각 밀도 아이콘 생성
```

카메라 권한 문구 추가 — `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA"/>
<uses-feature android:name="android.hardware.camera" android:required="false"/>
```

앱 식별자(이미 설정됨): `com.fable.chilmun` — 최초 업로드 후에는 변경 불가.

---

## 2. 서명키 만들고 릴리스 빌드

```bash
# 업로드 키스토어 생성 (한 번, 안전하게 보관!)
keytool -genkey -v -keystore chilmun-upload.keystore \
  -alias chilmun -keyalg RSA -keysize 2048 -validity 10000
```

`android/app/build.gradle` 또는 `key.properties`에 서명 설정 후:
```bash
npm run cap:open:android      # Android Studio 열림
# Build > Generate Signed Bundle / APK > Android App Bundle(.aab) 선택 → 릴리스 빌드
```
→ 산출물: `app-release.aab` (Play는 **AAB** 형식을 요구합니다.)

> ⚠️ 키스토어와 비밀번호는 분실하면 앱 업데이트가 불가합니다. 반드시 백업하세요.
> (Play App Signing을 켜면 업로드 키만 관리하면 되어 더 안전합니다.)

---

## 3. 개인정보처리방침 호스팅

Play는 개인정보처리방침 **URL**을 요구합니다(카메라 사용 앱은 필수).
`privacy-policy.html`을 HTTPS로 올리세요. 가장 쉬운 방법 — **GitHub Pages**:
- 저장소 Settings → Pages → 브랜치 지정 → `https://<계정>.github.io/<repo>/privacy-policy.html`
- (원하시면 이 저장소에 자동 배포 GitHub Actions를 넣어 드릴 수 있습니다.)

---

## 4. Play Console에서 앱 등록

1. **앱 만들기**: 이름 `칠문`, 언어 한국어, 앱/유료(또는 무료) 선택.
2. **스토어 등록정보**: `store/store-listing.md`의 문안 붙여넣기.
   - 앱 아이콘 512×512, 피처 그래픽 1024×500, 스크린샷 최소 2장 업로드.
3. **개인정보처리방침**: 3번의 URL 입력.
4. **앱 콘텐츠**:
   - 데이터 보안(Data Safety): "데이터 수집·전송 없음", 카메라는 기기 내 사용.
   - 콘텐츠 등급 설문 작성.
   - 타겟 연령·광고 포함 여부(광고 없음).
5. **프로덕션 트랙**에 `app-release.aab` 업로드 → 출시 국가 선택.
6. **유료 앱**이면: 가격 설정(판매자 계정 필요).
7. 검토 제출 → 구글 심사(보통 며칠) → 승인 시 게시.

---

## 5. 팁

- 처음엔 **내부 테스트 트랙**으로 올려 실기기 설치를 확인한 뒤 프로덕션으로 승격하는 걸 권장합니다.
- 전문가 유료 도구이므로, 스토어 설명 상단에서 "분석가용"임을 분명히 하면 환불·오해가 줄어듭니다.
- 업데이트 시: 웹 코드 수정 → `npm run cap:sync` → 버전 코드 올려 재빌드 → 새 AAB 업로드.

---

## 제가 대신 만들어 둔 것 vs 회원님이 할 것

| 항목 | 상태 |
|---|---|
| 앱 본체·아이콘·그래픽·스크린샷 | ✅ 완료 |
| 개인정보처리방침 문서 | ✅ 완료 (호스팅만 하면 됨) |
| 스토어 문안 | ✅ 완료 (복사용) |
| Capacitor 설정 | ✅ 완료 |
| 개발자 계정 등록·$25 결제 | ⬜ 회원님 |
| 서명키 생성·AAB 빌드 | ⬜ 회원님(PC) |
| 개인정보처리방침 HTTPS 호스팅 | ⬜ 회원님(원하면 자동배포 세팅 지원) |
| Play Console 업로드·심사 제출 | ⬜ 회원님 |
