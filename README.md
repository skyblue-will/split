# SPLIT - Circuit Timer

A programmable circuit training timer PWA. Build your circuit, hit start, train hands-free.

**Live PWA:** https://split-lac-six.vercel.app
**GitHub:** https://github.com/skyblue-will/split
**Auto-deploys** to Vercel on every push to master.

---

## Google Play Status: IN PROGRESS

### What's Done
- [x] Google Play Developer account (Skyblue Studio)
- [x] PWA live and passing all checks
- [x] Maskable icons generated
- [x] Digital Asset Links set up (`.well-known/assetlinks.json` with real SHA-256 fingerprint)
- [x] Privacy policy page live at `/privacy.html`
- [x] Store listing text ready (`store-assets/PLAY_STORE_LISTING.md`)
- [x] Store graphics generated (feature graphic, phone screenshots, tablet screenshots)
- [x] AAB generated via PWABuilder (package: `com.splitapp.timer`)
- [x] First AAB uploaded to Play Console (version code 1, internal/previous track)

### What's Left (Pick Up Here)
1. **Fix AAB signing key mismatch** — The v2 AAB from PWABuilder was signed with a NEW key. Play Console expects the ORIGINAL key from the first PWABuilder ZIP.
   - Find the **first PWABuilder ZIP** in Downloads (contains the original `.keystore` file)
   - Go to PWABuilder, regenerate with version code `2`, but choose **"Use existing"** signing key and upload the original keystore
   - If the original keystore is lost: go to Play Console > Setup > App integrity > Request upload key reset
2. **Upload the correctly-signed AAB** to the closed testing release
3. **Fill in release details:**
   - Release name: `1.0.0`
   - Release notes:
     ```
     <en-GB>
     Initial release of SPLIT - Circuit Timer. Build custom circuits with individual work and rest times per exercise, set your rounds, hit start and train hands-free. Audio beeps and vibration alert you on every transition.
     </en-GB>
     ```
4. **Complete remaining Play Console setup:**
   - Content rating questionnaire (simple fitness timer → "Everyone")
   - Data safety (collect no data → answer "No" to everything)
   - Target audience (select 18+)
   - Set pricing to £1.99 under Monetise > Pricing
5. **Closed testing:** Recruit 12 testers, run test for 14 days (Google requirement for new dev accounts)
6. **After 14 days:** Submit for production review

### PWABuilder Settings (for regenerating AAB)
- Package ID: `com.splitapp.timer`
- App name: SPLIT - Circuit Timer
- Display mode: Standalone
- Status bar color: `#0a0a0f`
- Nav bar color: `#0a0a0f`
- Version code: `2` (code 1 already used)
- Version name: `1.0.1`
- Signing key: **Use existing** — upload keystore from first PWABuilder ZIP

### Store Assets
All in `store-assets/`:
- `feature-graphic.png` (1024x500)
- `screenshot-home.png` (1080x1920)
- `screenshot-timer.png` (1080x1920)
- `screenshot-tablet-7.png` (1200x1920)
- `screenshot-tablet-10.png` (1600x2560)
- `PLAY_STORE_LISTING.md` — full listing copy
- `DEPLOY_GUIDE.md` — step-by-step deployment guide

---

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks, no build step)
- Service worker for offline support (`sw.js`, cache version: `split-v2`)
- Web Audio API for beep sounds
- Vibration API for haptic feedback
- Wake Lock API to keep screen on during workouts
- localStorage for saving workouts
