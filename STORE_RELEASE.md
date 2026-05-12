# Jepca — App Store Release Guide

Everything you need (besides accounts and a Mac) to submit to the Apple App Store and Google Play.

---

## 1. iOS — `ios/App/App/Info.plist`

After you run `npx cap add ios` locally, open `ios/App/App/Info.plist` and add the keys below inside the top-level `<dict>`. They are **required** — the app will crash when those features are first used otherwise.

```xml
<key>NSCameraUsageDescription</key>
<string>Jepca needs camera access so you can take photos for invoices, job notes and chat messages.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Jepca needs photo library access so you can attach existing pictures to invoices and chats.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Jepca saves photos you take in-app to your library so you have a copy.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Jepca uses your location to show nearby service providers and to calculate travel fees.</string>

<key>NSContactsUsageDescription</key>
<string>Jepca only reads contacts if you choose to share a provider with someone.</string>

<key>NSCalendarsUsageDescription</key>
<string>Jepca adds your bookings to your calendar so you never miss an appointment.</string>

<key>NSUserTrackingUsageDescription</key>
<string>This identifier is used to deliver personalized service recommendations.</string>
```

Also enable **Push Notifications** capability in Xcode → Signing & Capabilities, and add the **Background Modes → Remote notifications** capability.

## 2. Android — `android/app/src/main/AndroidManifest.xml`

Capacitor scaffolds most of these; verify they exist:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-feature android:name="android.hardware.camera" android:required="false"/>
```

For Google Play **Data Safety** form, declare you collect: Name, Email, Phone number, Approximate location, Precise location, Photos, Payment info. Mark all as "Used for app functionality" and "Encrypted in transit".

## 3. App store listing copy

**App name (≤30 chars):** Jepca — Local Services

**Subtitle (≤30 chars):** Book trusted home pros

**Promotional text (≤170 chars):** Find vetted local pros for cleaning, plumbing, electrical, landscaping and more. Book in seconds, pay securely, message in real time.

**Description (3,800 chars max):**
```
Jepca connects you with trusted local service providers — cleaners, plumbers,
electricians, landscapers, painters, movers and more.

WHY JEPCA
• Vetted, rated providers in your area
• Book in seconds with a clear price
• Real-time chat with your provider
• Secure card payments via Stripe
• Digital invoices and signed completions
• In-app notifications for every booking step

FOR SERVICE PROVIDERS
• List your services in minutes
• Get paid through Stripe Connect
• Manage bookings, invoices and reviews
• Track your team's time on jobs

We charge a small platform fee per booking — no monthly subscription.
```

**Keywords (iOS, ≤100 chars):** home services, cleaning, plumber, electrician, handyman, landscaping, booking, local pro

**Category (iOS):** Lifestyle (primary) / Business (secondary)
**Category (Android):** Lifestyle

**Age rating:** 4+ / Everyone

## 4. Screenshots (required sizes)

| Device | Size | Count |
|---|---|---|
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 | 3–10 |
| iPhone 6.5" (11 Pro Max) | 1242 × 2688 | 3–10 |
| iPad 12.9" | 2048 × 2732 | 3–10 |
| Android phone | 1080 × 1920+ | 2–8 |
| Android tablet (optional) | 1200 × 1920+ | – |

Suggested screens to capture: Home, Browse Services, Service Detail, Booking flow, Chat, Dashboard, Notifications.

## 5. App icon & splash

- Provide a single **1024×1024 PNG** (no transparency, no rounded corners).
- Generate the rest with: `npx @capacitor/assets generate --iconBackgroundColor '#0d9488' --iconBackgroundColorDark '#0d9488' --splashBackgroundColor '#0d9488' --splashBackgroundColorDark '#0d9488'`

## 6. Privacy & legal URLs

These are already live on the published web app — paste them into App Store Connect / Play Console:

- Privacy Policy: `https://jepcabooking.lovable.app/privacy`
- Terms of Service: `https://jepcabooking.lovable.app/terms`
- Cookie Policy: `https://jepcabooking.lovable.app/cookies`
- Support URL: `https://jepcabooking.lovable.app/`
- Marketing URL (optional): `https://jepcabooking.lovable.app/features`

## 7. Test accounts for review

App Store and Play both require a working test login. Create two before submitting:

- Consumer: `review-consumer@jepca.app` / strong password
- Provider: `review-provider@jepca.app` / strong password (with at least one published service)

Add these to the App Store Connect "Sign-in required" section.

## 8. Stripe before go-live

Switch `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` from `pk_test_…` / `sk_test_…` to `pk_live_…` / `sk_live_…`:

1. Update `STRIPE_SECRET_KEY` in Cloud → Connectors → Secrets
2. Update `STRIPE_PUBLISHABLE_KEY` constant in `src/lib/stripe.ts`
3. Configure live `STRIPE_WEBHOOK_SECRET` for the live `stripe-webhook` endpoint
4. Verify Stripe Connect is enabled in **live** mode for provider payouts

## 9. Final pre-submit checklist

- [ ] App icon (1024) added in Xcode/Android Studio
- [ ] Splash screen renders correctly on launch
- [ ] All `Info.plist` usage strings present
- [ ] Push notifications capability enabled (iOS)
- [ ] Test accounts created and roles assigned
- [ ] Stripe switched to live keys
- [ ] Live webhook secret configured
- [ ] Privacy/Terms URLs reachable
- [ ] Tested on real device (TestFlight + Play Internal Testing)
- [ ] Reviewed App Privacy questionnaire (iOS) + Data Safety form (Android)
