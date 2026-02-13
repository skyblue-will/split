# SPLIT - Circuit Timer

A programmable circuit training timer PWA. Build your circuit, hit start, train hands-free.

**Live PWA:** https://split-lac-six.vercel.app
**GitHub:** https://github.com/skyblue-will/split
**Auto-deploys** to Vercel on every push to master.

---

## Product

SPLIT is a programmable circuit training timer built for people who actually train. No more fumbling with a stopwatch between exercises. No more losing count of your rounds. Build your circuit once, hit start, and the app runs your entire workout — hands-free.

Set up any circuit you want: name each exercise, set individual work and rest durations, choose your rounds, and go. A 3-2-1-GO countdown kicks things off, then audio beeps and vibration pulses tell you exactly when to work and when to rest. The massive countdown display is readable from across the gym, with a colour-coded progress ring — green for work, orange for rest.

SPLIT works offline with no internet needed, keeps your screen on during workouts, and saves unlimited custom circuits. Four built-in presets get you started immediately: Full Body Blast, Tabata, Upper Body Circuit, and Core Crusher.

No accounts, no ads, no tracking. Your workouts stay on your device.

---

## Tech Stack
- Vanilla HTML/CSS/JS (no frameworks, no build step)
- Service worker for offline support (`sw.js`, cache version: `split-v2`)
- Web Audio API for beep sounds (no audio files)
- Vibration API for haptic feedback
- Wake Lock API to keep screen on during workouts
- localStorage for saving workouts
- CSS media queries for Wear OS smartwatch support (`@media (shape: round)`)

---

## Project Structure
```
split/
├── index.html              # PWA shell
├── app.js                  # Full app logic (~750 lines)
├── style.css               # Dark theme, mobile-first, watch support
├── sw.js                   # Service worker (cache: split-v2)
├── manifest.json           # PWA manifest
├── privacy.html            # Privacy policy for Play Store
├── icon.svg                # Source icon
├── icon-192.png            # App icon 192x192
├── icon-512.png            # App icon 512x512
├── icon-maskable-192.png   # Maskable icon for Android
├── icon-maskable-512.png   # Maskable icon for Android
├── .well-known/
│   └── assetlinks.json     # Digital Asset Links for TWA
└── store-assets/
    ├── feature-graphic.png         # 1024x500 Play Store banner
    ├── screenshot-home.png         # 1080x1920 phone screenshot
    ├── screenshot-timer.png        # 1080x1920 phone screenshot
    ├── screenshot-tablet-7.png     # 1200x1920 tablet screenshot
    ├── screenshot-tablet-10.png    # 1600x2560 tablet screenshot
    ├── PLAY_STORE_LISTING.md       # Full store listing copy
    └── DEPLOY_GUIDE.md             # Step-by-step deploy guide
```

---

## Deployment

### PWA (Web)
Every push to `master` auto-deploys to Vercel. No build step required.

### Google Play (Android)
The app is wrapped as a Trusted Web Activity (TWA) using PWABuilder. The TWA loads the live Vercel URL, so updating the PWA code automatically updates the Play Store app — no need to re-upload the AAB.

---

## Google Play Status: IN REVIEW

### Developer Account
- **Developer name:** Skyblue Studio
- **Package ID:** `com.splitapp.timer`
- **Price:** £1.99 / $1.99 / €1.99
- **Category:** Health & Fitness
- **Content rating:** Everyone
- **Target audience:** 16+

### What's Done
- [x] Google Play Developer account created
- [x] PWA live and passing all checks
- [x] Maskable icons generated
- [x] Digital Asset Links (`.well-known/assetlinks.json`) with SHA-256 fingerprint
- [x] Privacy policy live at `/privacy.html`
- [x] Store listing complete (text, graphics, screenshots)
- [x] AAB generated via PWABuilder and uploaded (version code 3)
- [x] Content rating questionnaire submitted
- [x] Data safety section completed (no data collected)
- [x] Target audience set (16+)
- [x] Ads declaration completed
- [x] App access instructions set (all functionality available without special access)
- [x] Closed testing release created (Alpha track, version 1.0.0.3)
- [x] Testers managed via Google Group: `testers-community@googlegroups.com`
- [x] Feedback channel: `will@willpalmer.co.uk`
- [x] 172 countries/regions added
- [x] Changes submitted for review (auto-checks running)

### What's Left
1. **Get 12 testers** — Use the [Testers Community](https://play.google.com/store/apps/details?id=com.testerscommunity) app (test 3 apps to earn credits, then post SPLIT)
2. **Wait 14 days** of closed testing (Google requirement for new developer accounts)
3. **Start full rollout** to production after the 14-day period

### PWABuilder Settings (for future AAB regeneration)
- Package ID: `com.splitapp.timer`
- App name: SPLIT - Circuit Timer
- Display mode: Standalone
- Status bar color: `#0a0a0f`
- Nav bar color: `#0a0a0f`
- Fallback behavior: Custom Tabs
- Google Play billing: Disabled (one-time purchase price, not in-app)
- ChromeOS: Disabled
- Meta Quest: Disabled
- Next version code: `4` (codes 1-3 used)
- Signing key: **Use existing** — keystore from first PWABuilder ZIP

### Signing Key
The upload signing key was generated by PWABuilder on first AAB generation. The keystore file is in the original PWABuilder download ZIP. **Do not lose this file** — it's required for all future AAB uploads.

SHA-256 fingerprint (in `assetlinks.json`):
```
4C:24:8F:91:23:7D:8B:B7:7D:E8:88:7F:5E:DA:F4:19:41:26:19:2E:A8:B5:5E:89:89:E0:6D:34:72:D6:F4:DC
```

---

## Google Play Developer API

The [Google Play Developer API](https://developers.google.com/android-publisher) can be used to automate publishing, manage releases, and query app data programmatically.

### Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **Google Play Android Developer API**
4. Create a **Service Account** and download the JSON key
5. In Play Console, go to **Setup > API access**
6. Link the Google Cloud project
7. Grant the service account permissions (e.g. release manager, read-only)

### Base URL
```
https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.splitapp.timer/
```

### Key Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| Create edit | POST | `edits` |
| Upload AAB | POST | `edits/{editId}/bundles` |
| Assign to track | PUT | `edits/{editId}/tracks/{track}` |
| Commit release | POST | `edits/{editId}:commit` |
| List tracks | GET | `edits/{editId}/tracks` |
| Get app details | GET | `edits/{editId}/details` |
| Read reviews | GET | `reviews` |
| Reply to review | POST | `reviews/{reviewId}:reply` |

### Available APIs
- **Publishing API** — upload AABs, manage releases, roll out to tracks (internal/alpha/beta/production)
- **Subscriptions & In-App Products API** — manage purchases and subscriptions
- **Reviews API** — read and reply to user reviews
- **Reporting API** — download stats, financials, crash reports

### Authentication
All requests use OAuth 2.0 via the service account JSON key. Example with `google-auth` library:
```python
from google.oauth2 import service_account
from googleapiclient.discovery import build

credentials = service_account.Credentials.from_service_account_file(
    'service-account-key.json',
    scopes=['https://www.googleapis.com/auth/androidpublisher']
)
service = build('androidpublisher', 'v3', credentials=credentials)
```

### Automated Release Flow
```python
package = 'com.splitapp.timer'

# 1. Create an edit
edit = service.edits().insert(packageName=package).execute()
edit_id = edit['id']

# 2. Upload AAB
with open('app.aab', 'rb') as f:
    bundle = service.edits().bundles().upload(
        packageName=package, editId=edit_id,
        media_body='app.aab', media_mime_type='application/octet-stream'
    ).execute()

# 3. Assign to production track
service.edits().tracks().update(
    packageName=package, editId=edit_id, track='production',
    body={'releases': [{'versionCodes': [bundle['versionCode']], 'status': 'completed'}]}
).execute()

# 4. Commit
service.edits().commit(packageName=package, editId=edit_id).execute()
```

---

## Store Listing

### Short Description (80 chars)
Build your circuit. Hit start. Train hands-free. Programmable gym timer.

### Full Description
See `store-assets/PLAY_STORE_LISTING.md`

### Store Assets
All in `store-assets/` — see Project Structure above.
