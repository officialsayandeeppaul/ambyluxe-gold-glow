# Fix Google Login & Mobile (Phone) Login

The errors **"Unsupported provider: provider is not enabled"** and **"Unsupported phone provider"** mean the providers are not enabled in your Supabase project. Enable them in the Dashboard (takes a few minutes).

---

## "This site can't be reached" / DNS PROBE FINISHED NXDOMAIN (Google login)

When you click **Continue with Google**, the browser goes to `wgtjsotmotpopmynkxis.supabase.co` and shows **This site can't be reached** with **DNS PROBE FINISHED NXDOMAIN**. That means your network or PC cannot resolve the Supabase domain (not an app bug).

**Do this:**

1. **Check internet** – Open [https://supabase.com](https://supabase.com) in a new tab. If that fails, the issue is general connectivity or DNS.
2. **Try another network** – Switch to mobile hotspot or a different Wi‑Fi. If it works there, the problem is your current network (firewall/VPN/ISP).
3. **Disable VPN** – If you use a VPN, turn it off and try again.
4. **Try another DNS** – In Windows: Settings → Network & Internet → Ethernet/Wi‑Fi → Edit DNS (e.g. **8.8.8.8** or **1.1.1.1**), then restart the browser.
5. **Confirm project** – In [Supabase Dashboard](https://supabase.com/dashboard), open project **wgtjsotmotpopmynkxis**. If the project is paused or missing, create/restore it and use its URL in `.env` (`VITE_SUPABASE_URL`).

After DNS/network is fixed, Google login should work without code changes.

---

## 1. Enable Google Login

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project **wgtjsotmotpopmynkxis**
2. Go to **Authentication** → **Providers**
3. Find **Google** and turn it **ON**
4. You need **OAuth credentials** from Google:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
   - Create **OAuth 2.0 Client ID** (type: **Web application**)
   - **Authorized redirect URIs**: add  
     `https://wgtjsotmotpopmynkxis.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**
5. Back in Supabase, paste **Client ID** and **Client Secret** into the Google provider, then **Save**

Google sign-in will work after this.

---

## 2. Enable Mobile (Phone) Login

### Recommended SMS providers

| Provider | Best for | Setup complexity | India (DLT) |
|----------|----------|------------------|-------------|
| **Twilio** | Most reliable, WhatsApp OTP support | Medium | DLT needed for production |
| **Vonage** | Simpler (no phone number in many countries) | Easy | DLT needed for production |
| MessageBird | – | Native integration is currently broken; avoid |
| TextLocal | India-specific | Community-supported |

Use **Twilio** for best Supabase integration and optional WhatsApp OTP. Use **Vonage** if you prefer simpler setup (API Key + Secret only) and no phone number in many regions.

---

### Option A: Twilio (recommended)

1. **Sign up** at [Twilio](https://www.twilio.com/try-twilio)
2. **Get credentials** from [Twilio Console](https://console.twilio.com/):
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click “Show” to reveal)
3. **Get a phone number**:
   - [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/search) → Buy a number
   - Trial accounts: verify your phone for testing
4. In **Supabase** → **Authentication** → **Providers** → **Phone**:
   - Turn **Phone** ON
   - Select **Twilio**
   - Paste **Account SID**, **Auth Token**, **Sender Phone Number**
   - Click **Save**

---

### Option B: Vonage (alternative)

1. **Sign up** at [Vonage (Nexmo)](https://dashboard.nexmo.com/sign-up)
2. **Get credentials** from the [Vonage Dashboard](https://dashboard.nexmo.com/):
   - **API Key**
   - **API Secret**
3. In **Supabase** → **Authentication** → **Providers** → **Phone**:
   - Turn **Phone** ON
   - Select **Vonage**
   - Paste **API Key** and **API Secret**
   - Optionally set **Sender ID** (alphanumeric, up to 11 chars; 8 for India)
   - Click **Save**

Vonage does not always require a phone number; many countries can use an alphanumeric Sender ID.

---

### India (TRAI DLT) note

To send OTPs to Indian numbers in production:

- **Twilio / Vonage**: DLT registration is required for domestic routes
- **International route**: Works without DLT but has higher cost and lower delivery (≈85–90%)
- **Indian providers** (MessageBot, SMS Gateway Hub, StartMessaging): Can be used via [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) and a custom edge function; native integration is not available

Until an SMS provider is configured, phone OTP will show **"Unsupported phone provider"**.

**Why only one number gets OTP (e.g. only 7679329685)?**  
With **Vonage or Twilio trial accounts**, SMS is often allowed only to **verified numbers** (the number you used when signing up). To get OTP on any number:
- **Vonage:** Dashboard → add and verify the numbers you need for testing, or upgrade the account.
- **Twilio:** Console → Phone Numbers → Verified Caller IDs: add each test number.
- **Production:** Use a paid account and complete DLT (India) if needed so all Indian numbers can receive OTP.

**Make OTP work for these numbers (all must receive OTP):**  
93827 06192, 99078 30912, 81029 99467, 70019 69025, 7679329685  

1. **Vonage (trial):** [Dashboard](https://dashboard.nexmo.com/) → **Numbers** or **Verify** / **Settings** → add each number above as a **verified** or **test** number. Send the verification code to each and complete verification. After that, OTP will be sent to all of them.
2. **Supabase:** No change needed. The app sends every number as `+91` + 10 digits (e.g. `+919382706192`). Same template and flow for all.
3. If you use **Vonage From** as a virtual number (not AMBYLUXE), delivery to Indian numbers is often more reliable on trial.

**Same SMS template every time**  
In Supabase → Auth → Providers → Phone, set the **SMS Message** once (e.g. `Your verification code for Amby Luxe is {{ .Code }}. Valid for 60 seconds.`) and **Save**. All OTPs use this template. If you see different text sometimes, re-save the template and clear any old/cached config.

**Production tip:** Configure rate limits and [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha) in Supabase to avoid SMS abuse.

---

## Production setup: OTP to every number

To send OTP to **any** number (not only a few verified ones), do this:

### 1. Vonage: Upgrade to paid

- In **[Vonage Dashboard](https://dashboard.nexmo.com/)**, top right: click **Add funds**.
- Add at least enough credit for your expected SMS volume (e.g. $10–20 to start).
- After you have a **paid balance**, Vonage enables **outbound traffic to any number** and removes trial limits. No need to “verify” each number; OTP will be sent to every number your app requests.

### 2. Vonage: Optional – use a virtual number for India

- For better delivery to Indian numbers, buy a **virtual number**: Vonage Dashboard → **Numbers** → **Buy numbers** (e.g. UK or US).
- In **Supabase** → Auth → Providers → **Phone** → **Vonage From**, set this number (e.g. `+44…` or `+1…`) instead of `AMBYLUXE`.
- Saves dealing with India DLT until you need it.

### 3. India only: DLT (for best delivery)

- For production SMS to **Indian** numbers, **DLT registration** is required (TRAI rules).
- Until DLT is done, Vonage can still send via international route to any Indian number (after step 1); delivery is usually 85–95% and a bit more expensive.
- When ready: register on a DLT platform, add your entity and template, then configure Vonage with your DLT details if required.

### 4. Supabase

- **Authentication** → **Providers** → **Phone**: keep **Vonage** ON with your API Key and Secret (and **Vonage From** from step 2 if you set it).
- **SMS Message**: keep one template, e.g. `Amby Luxe: Your verification code is {{ .Code }}. Expires in 60 sec.` and **Save**.

After step 1 (and optionally 2), your app will send OTP to every number; no code changes needed.

---

## 3. Redirect URLs

Under **Authentication** → **URL Configuration**:

- **Site URL**: `https://www.sayandeep.store` (or `http://localhost:8080` for local)
- **Redirect URLs**: add both
  - `http://localhost:8080/**`
  - `https://www.sayandeep.store/**`

Save. Then Google and email redirects will work for both local and production.
