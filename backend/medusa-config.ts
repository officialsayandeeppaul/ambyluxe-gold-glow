import path from 'path'
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const googleProviderId = process.env.MEDUSA_GOOGLE_PROVIDER_ID || 'google'
const phoneProviderId = process.env.MEDUSA_PHONE_PROVIDER_ID || 'phone'
const enableGoogleAuth = Boolean(
  process.env.MEDUSA_GOOGLE_CLIENT_ID &&
    process.env.MEDUSA_GOOGLE_CLIENT_SECRET &&
    process.env.MEDUSA_GOOGLE_CALLBACK_URL
)
const enablePhoneAuth = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
)

const providers: Array<Record<string, unknown>> = [
  {
    resolve: '@medusajs/auth-emailpass',
    id: 'emailpass',
  },
]

if (enableGoogleAuth) {
  providers.push({
    resolve: '@medusajs/auth-google',
    id: googleProviderId,
    options: {
      clientId: process.env.MEDUSA_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.MEDUSA_GOOGLE_CLIENT_SECRET!,
      callbackUrl: process.env.MEDUSA_GOOGLE_CALLBACK_URL!,
    },
  })
}

if (enablePhoneAuth) {
  providers.push({
    resolve: path.resolve(__dirname, '.medusa/server/src/providers/twilio-phone'),
    id: phoneProviderId,
    options: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID!,
    },
  })
}

const authMethods = ['emailpass']
if (enableGoogleAuth) authMethods.push(googleProviderId)
if (enablePhoneAuth) authMethods.push(phoneProviderId)

const razorpayKeyId =
  process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAY_ID
const razorpayKeySecret =
  process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_SECRET
const enableRazorpay = Boolean(razorpayKeyId && razorpayKeySecret)

const modules: Array<Record<string, unknown>> = [
  {
    resolve: '@medusajs/medusa/auth',
    options: {
      providers,
    },
  },
]

if (enableRazorpay) {
  modules.push({
    resolve: '@medusajs/medusa/payment',
    options: {
      providers: [
        {
          resolve: '@sgftech/payment-razorpay',
          id: 'razorpay',
          options: {
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
            razorpay_account:
              process.env.RAZORPAY_ACCOUNT?.trim() || undefined,
            webhook_secret:
              process.env.RAZORPAY_WEBHOOK_SECRET ??
              process.env.RAZORPAY_TEST_WEBHOOK_SECRET,
            /** Razorpay order uses automatic capture → payment is captured when checkout succeeds (no Admin “Capture payment”). */
            auto_capture: true,
            automatic_expiry_period: 30,
            manual_expiry_period: 20,
            refund_speed: 'normal',
          },
        },
      ],
    },
  })
}

const config = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        customer: authMethods,
        user: ["emailpass"],
      },
    }
  },
  modules,
  plugins: [],
})
config.plugins = config.plugins?.filter((plugin) => {
  if (typeof plugin === 'string') {
    return plugin !== '@medusajs/draft-order'
  }

  return plugin.resolve !== '@medusajs/draft-order'
})
module.exports = config
