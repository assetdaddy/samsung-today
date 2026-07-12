# 칠문 모바일 앱 안내 📲

칠문은 **두 가지 방식**으로 폰에서 쓸 수 있습니다.

---

## 방법 A. PWA — 지금 바로 설치 (권장, 빌드 불필요)

이미 설치형 웹앱(PWA)으로 완성돼 있습니다. **HTTPS로 호스팅**하면 폰에서 홈 화면에 앱처럼 깔립니다.

1. 정적 파일을 아무 HTTPS 호스팅(예: GitHub Pages, Netlify, Vercel, Cloudflare Pages)에 올립니다.
2. 폰 브라우저로 접속합니다.
   - **Android(Chrome)**: 대문에 뜨는 **“📲 홈 화면에 앱 설치”** 버튼을 누르거나, 메뉴 → “앱 설치”.
   - **iPhone(Safari)**: 공유 버튼 → **“홈 화면에 추가”**.
3. 홈 화면 아이콘(七)으로 실행하면 주소창 없이 **전체화면 앱**으로 뜨고, 한 번 연 뒤에는 **오프라인**에서도 동작합니다(서비스워커 캐시).

> PWA 특징: 설치·자동 업데이트·오프라인·홈 화면 아이콘·상태바 색상·노치(안전영역) 대응까지 포함되어 있습니다. 카메라(관상·손금)도 HTTPS에서 정상 동작합니다.

로컬 테스트:
```bash
python3 -m http.server 8000    # http://localhost:8000
```
(서비스워커·설치 프롬프트는 `https` 또는 `localhost`에서만 켜집니다.)

---

## 방법 B. 네이티브 앱(APK/IPA) — 앱스토어 배포용

같은 웹 코드를 **Capacitor**로 감싸 Google Play / App Store에 올릴 수 있는 네이티브 앱으로 만듭니다. 이미 `capacitor.config.json`·`package.json`이 준비돼 있습니다.

사전 준비: Node 18+, 그리고 Android는 **Android Studio**, iOS는 **Xcode(맥)**.

```bash
npm install                 # Capacitor 설치
npm run cap:add:android     # 안드로이드 프로젝트 생성
npm run cap:sync            # 웹 자산을 네이티브로 복사
npm run cap:open:android    # Android Studio 열기 → APK/AAB 빌드

# iOS (맥 전용)
npm run cap:add:ios
npm run cap:open:ios        # Xcode 열기 → 실기기/스토어 빌드
```

앱 아이콘은 `icons/`의 PNG를 각 플랫폼 아이콘 세트로 넣으면 됩니다
(권장 도구: `@capacitor/assets` — `npx capacitor-assets generate`).

카메라 권한 안내 문구는 네이티브 매니페스트에 추가하세요:
- Android `android/app/src/main/AndroidManifest.xml`: `<uses-permission android:name="android.permission.CAMERA"/>`
- iOS `Info.plist`: `NSCameraUsageDescription` = "관상·손금 사진 촬영에 사용됩니다."

> 참고: `webDir`가 `.`(저장소 루트)로 설정돼 있어, `server/`·`node_modules/`는 배포에서 제외하고 싶다면 별도 `www/` 폴더로 정적 파일만 모아 `webDir`를 바꾸는 것을 권장합니다.
