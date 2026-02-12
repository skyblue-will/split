# Getting SPLIT on Google Play - Step by Step

## What You Have
- PWA live at: https://split-lac-six.vercel.app
- GitHub repo: https://github.com/skyblue-will/split
- Auto-deploys to Vercel on every push
- Store graphics in /store-assets/

## Step 1: Google Play Developer Account
1. Go to https://play.google.com/console
2. Sign in with your Google account
3. Pay the one-time $25 registration fee
4. Fill in your developer profile (name, email, etc.)
5. Wait for approval (usually instant, can take up to 48 hours)

## Step 2: Generate the Android Package with PWABuilder
1. Go to https://www.pwabuilder.com
2. Enter: https://split-lac-six.vercel.app
3. Click "Start" - it will analyse the PWA
4. Click "Package for stores" or "Build" > select "Android"
5. On the Android options screen, set:
   - Package ID: com.splitapp.timer
   - App name: SPLIT - Circuit Timer
   - Display mode: Standalone
   - Status bar color: #0a0a0f
   - Nav bar color: #0a0a0f
   - Signing key: "Create new" (PWABuilder generates one for you)
6. Click "Generate"
7. Download the ZIP file
8. Inside the ZIP you'll find:
   - An .aab file (the Android App Bundle - this is what you upload to Play)
   - A signing key info file with the SHA-256 fingerprint
   - An assetlinks.json file

## Step 3: Update Digital Asset Links
1. Open the signing key info from Step 2
2. Copy the SHA-256 fingerprint (looks like: AB:CD:12:34:...)
3. Open .well-known/assetlinks.json in the repo
4. Replace PLACEHOLDER:REPLACE_WITH_ACTUAL_SIGNING_KEY_FINGERPRINT with the real fingerprint
5. Commit and push - Vercel will auto-deploy
6. Verify it works: visit https://split-lac-six.vercel.app/.well-known/assetlinks.json

## Step 4: Create the Play Store Listing
1. In Google Play Console, click "Create app"
2. App name: SPLIT - Circuit Timer
3. Default language: English (United Kingdom)
4. App or game: App
5. Free or paid: Paid
6. Fill in the store listing:
   - Short description: (see PLAY_STORE_LISTING.md)
   - Full description: (see PLAY_STORE_LISTING.md)
   - App icon: upload icon-512.png from the repo
   - Feature graphic: upload store-assets/feature-graphic.png
   - Phone screenshots: upload the screenshot PNGs from store-assets/
7. Set the price to £1.99 (under Monetise > Pricing)

## Step 5: Upload the AAB
1. Go to "Production" in the left sidebar
2. Click "Create new release"
3. Upload the .aab file from Step 2
4. Add release notes: "Initial release"
5. Click "Review release" then "Start rollout to Production"

## Step 6: Content Rating
1. Go to "Policy" > "App content" > "Content rating"
2. Fill in the questionnaire (it's a simple fitness timer, no violence/etc.)
3. You'll get an "Everyone" rating

## Step 7: Submit for Review
1. Make sure all sections in the dashboard show green checkmarks
2. Click "Submit for review"
3. Google reviews new apps in 1-7 days (usually 1-3)
4. You'll get an email when it's approved

## After Approval
- Your app is live on Google Play at the price you set
- Every push to GitHub auto-deploys to Vercel
- The TWA wrapper always loads the latest version from your Vercel URL
- No need to re-upload the AAB when you update the PWA code

## Important: Keep Your Signing Key Safe
PWABuilder gives you a signing key when you generate the package.
SAVE THIS KEY. If you lose it, you cannot update the app on Google Play.
Store it somewhere safe (NOT in the public GitHub repo).
