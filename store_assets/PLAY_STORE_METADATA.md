# AFRIQORA — Google Play Store Listing & Data Safety Details

This reference document contains the exact text and answers needed when completing your app listing on the **Google Play Console**.

---

## 1. App Details

- **App Name**: `AFRIQORA`
- **Short Description** (79 / 80 characters):
  `The self-service African commerce, creator, and business networking platform.`
- **Full Description**:
  ```
  AFRIQORA is the premier self-service African commerce, creator, and business networking platform designed to empower African entrepreneurs, brands, creators, and everyday consumers.

  KEY FEATURES:
  • Self-Serve Commercial Hub: Register, verify, and manage your official business storefront with zero friction.
  • Transparent Creator Monetization: Earn transparent creator revenue through verified video views with anti-fraud tracking.
  • Smart Reach Distribution: Expand your content's audience across African markets based on real viewer engagement signals.
  • Multilingual Localization: Seamlessly switch between English, French, and Swahili.
  • Direct Real-Time Messaging & WebRTC Calling: High-performance, peer-to-peer audio and video communication.
  • Privacy-First Architecture: AFRIQORA never sells personal user data. All business directory metrics use privacy-preserving aggregates.

  Join thousands of African businesses and creators building the future of digital African commerce.
  ```

---

## 2. Category & Contact Details

- **App Category**: `Business` (Secondary tag: `Social` / `Productivity`)
- **Content Rating**: `Everyone` / `Teen` (standard UGC social/commerce platform)
- **Target Audience**: 13+ / 18+

---

## 3. Privacy Policy URL

- **URL**: `https://afriqora.com/privacy` (or your domain privacy policy page)

---

## 4. Google Play Data Safety Declaration

When filling out the **Data Safety** form on Google Play Console, use these accurate declarations:

1. **Data Collection & Sharing**:
   - **Does your app collect or share any user data?** $\rightarrow$ **Yes**
   - **Is all of the user data collected encrypted in transit?** $\rightarrow$ **Yes** (HTTPS & WSS TLS encryption)
   - **Do you provide a way for users to request that their data be deleted?** $\rightarrow$ **Yes** (in account settings / upon request)

2. **Specific Data Types Collected**:
   - **Personal info**: Name & Email address (Collected for Account management & Authentication).
   - **Photos and Videos**: Photos/videos uploaded by user (Collected only for Post creation and Business verification documents, not shared with third parties).
   - **Audio**: Microphone access (Used only for live WebRTC voice/video calling when active; audio is never recorded or stored on servers).
   - **Messages**: In-app direct messages (Used for user-to-user business communication).

3. **Data Sharing**:
   - **Is any personal data sold to third-party data brokers or advertisers?** $\rightarrow$ **No (Zero Data Selling)**.
