# 🚀 Graphite Notes — Amazon Appstore Publishing Guide

> **No Android Studio required. No Xcode. Your PC just needs Node.js and JDK 21.**
> All actual APK building happens on GitHub's free cloud servers.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [One-Time Local Setup](#2-one-time-local-setup)
3. [Configure GitHub Secrets](#3-configure-github-secrets)
4. [Amazon Developer Account (FREE)](#4-amazon-developer-account-free)
5. [How CI/CD Works — Every Release](#5-how-cicd-works--every-release)
6. [Submit APK to Amazon Appstore](#6-submit-apk-to-amazon-appstore)
7. [Amazon Store Listing Requirements](#7-amazon-store-listing-requirements)
8. [Privacy Policy](#8-privacy-policy)
9. [What Needs Manual Work](#9-what-needs-manual-work)
10. [Also: Publish as PWA (Optional Web Deploy)](#10-also-publish-as-pwa-optional-web-deploy)

---

## 1. Architecture Overview

```
Your code on GitHub
        │
        │  git tag v1.0.0  (you run this once)
        ▼
GitHub Actions (ubuntu-latest — FREE cloud runner)
        │
        ├── npm ci + npm run build     ← builds Vite web app
        ├── npx cap sync android       ← injects web app into android/
        ├── ./gradlew assembleRelease  ← compiles signed APK (Gradle on GitHub)
        │
        ▼
app-release.apk attached to GitHub Release
        │
        ▼ (manual upload — ~5 min)
Amazon Developer Console → Upload APK → Submit
```

**Your CPU does 0 work.** GitHub's server compiles everything. You only need to:
- Run 2 commands once to create the `android/` folder
- Upload the finished `.apk` to Amazon Appstore

---

## 2. One-Time Local Setup

These commands run **once on your machine only**. After this, everything is automated.

### Step 2A — Install JDK 21 (needed for `keytool` and Gradle)

Download from: https://adoptium.net/temurin/releases/?version=21
- Pick **Windows x64 Installer (.msi)**
- Install it — this gives you `keytool` in your terminal

### Step 2B — Create the Android project

```powershell
# In the shared-editor folder:
cd "c:\Users\USER\3D Objects\Note Taking App\shared-editor"

# Build the web app first (so android/ has something to sync)
npm run build

# Add the Android platform (creates the android/ folder)
npx cap add android

# Copy the web build into the android project
npx cap sync android
```

This creates `android/` at the project root. **Commit this folder to GitHub.**

### Step 2C — Copy network security config

```powershell
# Copy the pre-made config into the android project
Copy-Item -Path "c:\Users\USER\3D Objects\Note Taking App\android-config\res\xml\network_security_config.xml" `
          -Destination "c:\Users\USER\3D Objects\Note Taking App\shared-editor\android\app\src\main\res\xml\network_security_config.xml" `
          -Force
```

Then open `shared-editor\android\app\src\main\AndroidManifest.xml` and add this to `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

### Step 2D — Generate a signing keystore

```powershell
# In any folder (keep this .jks file safe — back it up!)
keytool -genkey -v `
  -keystore graphite-release.jks `
  -alias graphite `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

When prompted:
- First and Last Name: `Graphite Notes`
- Organization Unit: (press Enter)
- Organization: your name or company
- City, State, Country: your details
- Key password: choose a strong password (remember it!)
- Store password: same or different strong password

### Step 2E — Encode keystore for GitHub

```powershell
# This copies the base64-encoded keystore to your clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes("graphite-release.jks")) | Set-Clipboard
Write-Host "Keystore copied to clipboard!"
```

### Step 2F — Commit the android/ folder

```powershell
cd "c:\Users\USER\3D Objects\Note Taking App"
git add shared-editor/android/ android-config/
git commit -m "chore: add Capacitor Android project"
git push
```

---

## 3. Configure GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**

Add these 4 secrets:

| Secret Name | Value | How to get it |
|-------------|-------|---------------|
| `ANDROID_KEYSTORE_B64` | (paste from Step 2E clipboard) | Base64 of your `.jks` file |
| `ANDROID_KEY_ALIAS` | `graphite` | The alias you used in keytool |
| `ANDROID_KEY_PASS` | your key password | The password you set in keytool |
| `ANDROID_STORE_PASS` | your store password | The password you set in keytool |

Optional (for Supabase backend in builds):

| Secret Name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

---

## 4. Amazon Developer Account (FREE)

**Amazon Appstore has NO registration fee** (unlike Google Play's $25).

1. Go to: https://developer.amazon.com/apps-and-services
2. Click **Sign In** → use your existing Amazon account OR create a new one
3. Go to **Developer Console** → complete your developer profile
4. No payment required for free apps

---

## 5. How CI/CD Works — Every Release

### Debug builds (every push to `main`)
Every time you push code, GitHub automatically builds a **debug APK** for testing.
You can download it from: **GitHub → Actions → Latest run → Artifacts**

### Release builds (when you tag a version)
```powershell
# On your machine — 2 commands to publish a new version:
cd "c:\Users\USER\3D Objects\Note Taking App"
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will:
1. ✅ Install Node.js & build the web app
2. ✅ Set up JDK 21 + Android SDK (on their server)
3. ✅ Run `npx cap sync android`
4. ✅ Sign the APK with your keystore (from secrets)
5. ✅ Upload `app-release.apk` as a GitHub Release artifact
6. ✅ Create a GitHub Release page with download link

The workflow file is at: `.github/workflows/android-release.yml`

**Build time**: ~8–15 minutes. You'll get a notification when it's done.

### Downloading the APK
1. Go to your GitHub repository
2. Click **Releases** (right sidebar)
3. Open the latest release
4. Download `app-release.apk` from "Assets"

---

## 6. Submit APK to Amazon Appstore

Do this after downloading `app-release.apk` from your GitHub Release.

### Step-by-step:

1. **Open Developer Console**: https://developer.amazon.com/apps-and-services
2. Click **Add a New App** → Select **Android**
3. Fill in:
   - **App Title**: `Graphite Notes — Canvas & AI`
   - **App SKU**: `com.authorss81.graphite` (auto-filled usually)
   - **Category**: `Productivity`
   - **Sub-Category**: `Note Taking`
   - Click **Save**

4. **Availability & Pricing** tab:
   - Price: **Free**
   - Countries: Select all or specific regions
   - Click **Save**

5. **Description** tab:
   - **Short Description** (≤170 chars):
     > Local-first notes with inline canvas, AI assistant, end-to-end encryption, and offline support.
   - **Long Description** (≤4000 chars): see template below
   - **Keywords**: notes, canvas, drawing, AI, encryption, offline, markdown
   - Click **Save**

6. **Images & Multimedia** tab (REQUIRED — see Section 7 for exact specs):
   - App Icon (512×512 PNG)
   - 3–10 Screenshots
   - Feature Graphic (optional but recommended)
   - Click **Save**

7. **Content Rating** tab:
   - Answer the questionnaire (Graphite is: no violence, no adult content, no user communication)
   - Rating will auto-assign as **Everyone**
   - Click **Save**

8. **Binary File(s)** tab:
   - Click **Upload your APK**
   - Select your `app-release.apk`
   - Wait for upload & processing (~2 min)
   - **Device Support**: Check all Fire Tablet and Android devices
   - Click **Save**

9. **Privacy Policy** tab:
   - URL: `https://your-deployed-site.com/privacy-policy.html`
   - (After deploying to Vercel/Netlify, this URL will be your Graphite privacy page)
   - Click **Save**

10. **Submit App**:
    - Review all tabs (green checkmarks)
    - Click **Submit App**
    - Review time: **1–3 business days**

### Long Description Template:
```
Graphite Notes is a powerful local-first note-taking app with an inline canvas, AI writing assistant, and optional end-to-end encryption.

✏️ RICH NOTES
Write in a beautiful rich-text editor with support for headings, lists, code blocks, math equations, Mermaid diagrams, and more.

🎨 INLINE CANVAS
Draw, sketch, and create diagrams directly inside your notes using a powerful Excalidraw-based canvas — no switching apps.

🔐 PRIVACY FIRST
All notes are stored locally on your device. Optional cloud sync is available with end-to-end encryption — not even we can read your encrypted notes.

🤖 AI ASSISTANT
Built-in AI writing assistant to help you brainstorm, summarise, and refine your notes.

⚡ OFFLINE FIRST
Works completely offline. Notes are saved instantly and sync in the background when you reconnect.

🔍 INSTANT SEARCH
Fast offline search across all your notes with keyboard navigation.

📁 ORGANISE
Folders, tags, pinned notes, and a graph view to see connections between your ideas.
```

---

## 7. Amazon Store Listing Requirements

### Required Graphics

| Asset | Size | Format | Notes |
|-------|------|--------|-------|
| **App Icon** | 512×512 px | PNG, no transparency | Main app icon |
| **Screenshots** | Min 3, max 10 | PNG or JPG | Phone: 1080×1920 recommended |
| **Feature Graphic** | 1024×500 px | PNG or JPG | Shown at top of listing |

> **You already have**: `icon-512.png` at `shared-editor/public/icon-512.png` ✅
>
> **You need to create**: Screenshots and feature graphic

### How to take screenshots without a phone:
1. Open Chrome → F12 → Toggle Device Toolbar
2. Select "Pixel 7" or "Galaxy S23"
3. Open your app at `http://localhost:5173`
4. Take screenshots using the device toolbar's camera icon
5. Screenshot dimensions: use 1080×1920

### Feature Graphic ideas:
- Use Canva (free): canva.com → create 1024×500 graphic
- Show the app logo + tagline: "Local-first notes with canvas & AI"

---

## 8. Privacy Policy

Your privacy policy page is already created at:
`shared-editor/public/privacy-policy.html`

After you deploy to Vercel/Netlify, it will be available at:
`https://your-app-url.vercel.app/privacy-policy.html`

Use this URL in the Amazon Developer Console's Privacy Policy field.

---

## 9. What Needs Manual Work

Things that **cannot be automated** — you must do these by hand:

| # | Task | Time | Where | Status |
|---|------|------|-------|--------|
| M1 | Install JDK 21 from adoptium.net | 5 min | Your PC | ✅ Done (JDK 17.0.19 installed) |
| M2 | Run `npx cap add android` to create android/ folder | 2 min | Your terminal (inside `shared-editor`) | ✅ Done — committed to repo |
| M3 | Generate signing keystore with `keytool` | 2 min | Your terminal | ❌ Not done |
| M4 | Add 4 secrets to GitHub repo settings | 5 min | github.com → Settings → Secrets | ❌ Not done |
| M5 | Create Amazon Developer account (free) | 10 min | developer.amazon.com | ❌ Not done |
| M6 | Fill in store listing details + screenshots | 30–60 min | Amazon Developer Console | ❌ Not done |
| M7 | Tag a version → CI builds signed APK | 1 min | `git tag v1.0.0 && git push origin v1.0.0` | ⚠️ Tag exists but needs re-push after CI fixes |
| M8 | Deploy web app to Vercel/Netlify for privacy policy URL | 5 min | vercel.com or netlify.com | ❌ Not done |
| M9 | Add `android:networkSecurityConfig` to AndroidManifest.xml | 2 min | `shared-editor/android/` folder | ✅ Done — committed to repo |

**Total manual time for first release: ~1 hour** (M1, M2, M9 already done ✅)

---

## 10. Also: Publish as PWA (Optional Web Deploy)

Graphite is also a full PWA. Users can install it from Chrome without any app store.

### Deploy to Vercel (2 minutes):
```powershell
cd "c:\Users\USER\3D Objects\Note Taking App\shared-editor"
npm install -g vercel
vercel
```

Follow the prompts. You get a free HTTPS URL (e.g. `https://graphite-notes.vercel.app`).

### Deploy via GitHub Actions (auto-deploy on every push):
The workflow already runs `npm run build` — add this step to deploy to Vercel:
```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    working-directory: shared-editor
```

---

## 11. Verification-Free & Anonymous Android App Stores

If you want to distribute Graphite without undergoing official ID verification, passport uploads, or tax registration (which Google Play, Apple App Store, and occasionally Amazon Developer Console require), you can publish your APK on these free, verification-free alternative platforms:

### Option A: GitHub Releases (Best & Easiest)
Since you already have the GitHub Actions release workflow configured in your repo, this is already fully automated!
- **Verification needed**: None (just your normal GitHub account).
- **How it works**: When you push a git tag (e.g. `git tag v1.0.0 && git push origin v1.0.0`), GitHub Actions compiles the signed production APK and attaches it to the releases tab on your repository.
- **User experience**: You share the release link. Users download the `.apk` directly and install it.

### Option B: Aptoide (Largest Alternative Store)
Aptoide is a massive alternative app store with over 300 million users. They do not require ID verification or tax forms for free apps.
- **Verification needed**: None.
- **How to publish**:
  1. Register for a free developer account at [Aptoide Connect](https://connect.aptoide.com/).
  2. Create your own personal store name (e.g., `authorss81.aptoide.com`).
  3. Upload the `app-release.apk` directly through their developer console.
  4. The app is live instantly after an automated security scan.

### Option C: Itch.io (Indie Tools & Games Store)
Itch.io is a popular distribution platform for indie games and creator tools. It does not require any identity verification (KYC) to host free projects.
- **Verification needed**: None (only needed if you request paid downloads).
- **How to publish**:
  1. Register for a free account on [itch.io](https://itch.io/) and verify your email.
  2. Click **Create new project**. Set classification to **Tool** and type to **Downloadable**.
  3. Upload the `app-release.apk` file and set the price to Free.

### Option D: IzzyOnDroid / F-Droid (FOSS Index)
IzzyOnDroid is a repository that hosts free and open-source Android apps. It does not require developer identity verification or KYC.
- **Verification needed**: None (only a check to ensure your repo is open-source and tracker-free).
- **How to publish**:
  1. Go to the [IzzyOnDroid Submission Page](https://apt.izzysoft.de/fdroid/).
  2. Submit your public GitHub repository URL.
  3. Their system will scan your code and automatically build/package the APK directly from your GitHub releases every time you make a tag.

> ⚠️ **Important Security Note on Google's Verification Mandate**: Beginning September 2026, Google is globally rolling out a mandatory developer verification requirement across all certified Android devices (devices with Google Play Services). If you distribute your APK outside of Google Play (such as via Aptoide or direct link), Google Play Protect may warn or block installations unless your app's package name and signing key are registered in the Google Developer Console. F-Droid and GitHub downloads are unaffected on uncertified/de-Googled devices.

---

## Summary

| What | Cost | Time |
|------|------|------|
| GitHub Actions builds | **FREE** | Automated |
| Amazon Appstore account | **FREE** | One-time |
| First release setup | **FREE** | ~1.5 hours |
| Per-release after setup | **FREE** | 5 minutes (`git tag + upload APK`) |
| Vercel PWA hosting | **FREE** | 2 minutes |
