# 🚀 Complete Beginner's Guide: Publishing Graphite to Web, Mobile & App Stores

Welcome! This step-by-step guide explains how to take your **Graphite PWA** and publish it everywhere:
- 🌐 **Web** (Vercel / Netlify / Cloudflare Pages)
- 🤖 **Android Stores** (Google Play Store, Amazon Appstore, Samsung Galaxy Store)
- 💻 **Desktop Apps** (Windows `.exe`/`.msix`, Mac `.dmg`, Linux `.AppImage`)
- 🍎 **Apple App Store** (iOS)

No prior app store or deployment experience required. Follow each section in order!

---

## Table of Contents
1. [Overview of the Publishing Process](#1-overview-of-the-publishing-process)
2. [Step 1: Host Your PWA on the Web (Free & Required First)](#step-1-host-your-pwa-on-the-web-free--required-first)
3. [Step 2: Publish to Android (Google Play & Amazon Appstore)](#step-2-publish-to-android-google-play--amazon-appstore)
   - [Method A: PWABuilder (Easiest — No Coding Required)](#method-a-pwabuilder-easiest--no-coding-required)
   - [Method B: Capacitor (Advanced — Full Native Features)](#method-b-capacitor-advanced--full-native-features)
   - [Submitting to Amazon Appstore](#submitting-to-amazon-appstore)
   - [Submitting to Google Play Store](#submitting-to-google-play-store)
4. [Step 3: Publish to Windows & Desktop](#step-3-publish-to-windows--desktop)
5. [Step 4: Publish to iOS / Apple App Store](#step-4-publish-to-ios--apple-app-store)
6. [Summary Checklist](#6-summary-checklist)

---

## 1. Overview of the Publishing Process

Graphite is built as a **Progressive Web App (PWA)**. Because of this, you don't need to rebuild your code 4 times for 4 different operating systems!

```
                    ┌────────────────────────┐
                    │   Graphite PWA Code    │
                    └───────────┬────────────┘
                                │
                      Deploy to Web (HTTPS)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
  🤖 Android (APK/AAB)   💻 Desktop (MSIX/Exe)   🍎 iOS (IPA)
  • Google Play          • Windows Store          • Apple App Store
  • Amazon Appstore      • Direct .exe download
  • Samsung Store
```

---

## Step 1: Host Your PWA on the Web (Free & Required First)

Before you can create Android APKs or submit to stores, your PWA needs a live HTTPS Web URL (e.g. `https://graphite-notes.vercel.app`).

### Option 1A: Deploy with Vercel (Recommended — 2 Minutes)

1. Create a free account at [vercel.com](https://vercel.com).
2. Install the Vercel CLI (or connect your GitHub repository):
   ```bash
   npm install -g vercel
   ```
3. Inside `shared-editor`, run:
   ```bash
   vercel
   ```
4. Follow the prompt defaults. Vercel will build your app and give you a live production URL (e.g. `https://graphite.vercel.app`).

### Option 1B: Deploy with Netlify
1. Create a free account at [netlify.com](https://netlify.com).
2. Drag and drop your `shared-editor/dist` folder into the Netlify dashboard, or link your GitHub repo.

---

## Step 2: Publish to Android (Google Play & Amazon Appstore)

You have **two main paths** to generate an Android package (`.apk` or `.aab`) from your web app:

### Method A: PWABuilder (Easiest — No Coding Required)

[PWABuilder](https://www.pwabuilder.com/) is a free tool maintained by Microsoft that converts any PWA into a store-ready Android package in 3 clicks.

1. Open [PWABuilder.com](https://www.pwabuilder.com/).
2. Enter your live web URL (e.g. `https://graphite.vercel.app`) and click **Start**.
3. PWABuilder will audit your PWA (Icons, Manifest, Service Worker).
4. Click **Package for Stores** → Select **Android**.
5. Fill in:
   - **Package ID**: `com.graphite.notes`
   - **App Name**: `Graphite Notes & Canvas`
6. Click **Generate**. PWABuilder will download a `.zip` file containing:
   - `app-release-signed.apk` (for direct installation & Amazon Appstore)
   - `app-release.aab` (Android App Bundle for Google Play Store)

---

### Method B: Capacitor (Advanced — Full Native Features)

If you want deeper native API access (device hardware, native file system), use Ionic Capacitor:

1. In your `shared-editor` directory, run:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init Graphite com.graphite.notes --web-dir dist
   npx cap add android
   ```
2. Build your web app and copy to Android:
   ```bash
   npm run build
   npx cap copy android
   npx cap open android
   ```
3. Android Studio will open automatically. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK**.

---

### Submitting to Amazon Appstore

The **Amazon Appstore** lets millions of Fire Tablet, Fire TV, and Android users download your app.

1. **Create Account**: Go to the [Amazon Developer Console](https://developer.amazon.com/apps-and-services) and register for a free developer account.
2. **Add New App**:
   - Click **Add New App** → **Android**.
   - App Title: `Graphite — Notes, Canvas & AI`
   - Category: `Productivity`
3. **Upload APK**:
   - Go to the **Binary File(s)** tab.
   - Upload your `app-release-signed.apk` generated from PWABuilder or Capacitor.
4. **App Details & Screenshots**:
   - Upload your app icon (512x512 PNG).
   - Add 3-5 screenshots of Graphite in action.
   - Set price to **Free**.
5. **Submit**: Click **Submit App**. Review usually takes 24–48 hours.

---

### Submitting to Google Play Store

1. **Developer Account**: Sign up at [Google Play Console](https://play.google.com/console) ($25 one-time fee).
2. **Create App**: Click **Create App** → set default language and title.
3. **Upload AAB**: Go to **Internal testing** or **Production** → Upload `app-release.aab`.
4. **Store Listing**:
   - Add short description, full description, screenshots, and feature graphic (1024x500).
   - Complete Content Rating questionnaire and Privacy Policy URL.
5. **Publish**: Submit for review.

---

## Step 3: Publish to Windows & Desktop

### Option A: PWABuilder Windows Packaging (Easiest)
1. Go to [PWABuilder.com](https://www.pwabuilder.com/).
2. Enter your live URL.
3. Click **Package for Stores** → **Windows**.
4. Download the `.msix` bundle.
5. Upload to the **Microsoft Store Partner Center** or distribute `.msix` directly to users.

### Option B: Tauri (Native Desktop Application)
To build native lightweight `.exe` (Windows) and `.dmg` (Mac) binaries using Rust:
1. Install Rust from [rustup.rs](https://rustup.rs).
2. In `shared-editor`, run:
   ```bash
   npm install -D @tauri-apps/cli
   npx tauri init
   npx tauri build
   ```
3. Output installers will be generated in `src-tauri/target/release/bundle/`.

---

## Step 4: Publish to iOS / Apple App Store

1. **Prerequisites**: Apple Mac computer + Apple Developer Program membership ($99/year).
2. **Add iOS Platform**:
   ```bash
   npm install @capacitor/ios
   npx cap add ios
   npx cap open ios
   ```
3. Xcode will open. Select your Signing Team, select **Any iOS Device (arm64)**, and click **Product** → **Archive**.
4. Upload to **App Store Connect** and submit for review.

---

## 6. Summary Checklist

- [x] PWA Manifest & Icons generated (`icon-192.png`, `icon-512.png`)
- [x] Service Worker registered (`registerSW`)
- [ ] Deploy PWA to HTTPS host (Vercel / Netlify)
- [ ] Run PWA through [PWABuilder.com](https://www.pwabuilder.com/)
- [ ] Download `.apk` for Amazon Appstore & `.aab` for Google Play
- [ ] Submit to Amazon Appstore & Google Play Console
- [ ] Enjoy cross-platform distribution!
