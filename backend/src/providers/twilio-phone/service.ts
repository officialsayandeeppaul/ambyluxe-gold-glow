import { MedusaError } from "@medusajs/framework/utils"
import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
  Logger,
} from "@medusajs/framework/types"
import Twilio from "twilio"

type InjectedDependencies = {
  logger: Logger
}

type TwilioPhoneAuthOptions = {
  accountSid: string
  authToken: string
  verifyServiceSid: string
}

export class TwilioPhoneAuthService extends AbstractAuthModuleProvider {
  static identifier = "phone"
  static DISPLAY_NAME = "Phone OTP (Twilio Verify)"

  protected logger_: Logger
  protected config_: TwilioPhoneAuthOptions
  protected client_: ReturnType<typeof Twilio>

  static validateOptions(options: TwilioPhoneAuthOptions) {
    if (!options.accountSid) throw new Error("Twilio accountSid is required")
    if (!options.authToken) throw new Error("Twilio authToken is required")
    if (!options.verifyServiceSid) throw new Error("Twilio verifyServiceSid is required")
  }

  constructor({ logger }: InjectedDependencies, options: TwilioPhoneAuthOptions) {
    // @ts-ignore
    super(...arguments)
    this.logger_ = logger
    this.config_ = options
    this.client_ = Twilio(options.accountSid, options.authToken)
  }

  async register(
    data: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    return this.authenticate(data, authIdentityService)
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const phone = data.body?.phone?.trim()
    const otp = (data.body?.otp ?? data.body?.code)?.trim()

    if (!phone) {
      return { success: false, error: "Phone is required" }
    }

    // Step 1: request OTP
    if (!otp) {
      try {
        // SMS copy uses the Verify Service "Friendly name" in Twilio Console (e.g. "Amby Luxe Jewels").
        await this.client_.verify.v2
          .services(this.config_.verifyServiceSid)
          .verifications.create({ to: phone, channel: "sms" })

        // Medusa auth flow expects success only after identity is verified,
        // so we return a typed error that storefront treats as "OTP sent".
        return { success: false, error: "OTP_SENT" }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unable to send OTP"
        this.logger_.error(`Twilio OTP send failed: ${message}`)
        return { success: false, error: message }
      }
    }

    // Step 2: verify OTP and authenticate
    try {
      const verification = await this.client_.verify.v2
        .services(this.config_.verifyServiceSid)
        .verificationChecks.create({ to: phone, code: otp })

      if (verification.status !== "approved") {
        return { success: false, error: "Invalid OTP" }
      }

      try {
        const authIdentity = await authIdentityService.retrieve({ entity_id: phone })
        return { success: true, authIdentity }
      } catch (e: any) {
        if (e?.type === MedusaError.Types.NOT_FOUND) {
          const created = await authIdentityService.create({
            entity_id: phone,
            user_metadata: { phone },
          })
          return { success: true, authIdentity: created }
        }
        return { success: false, error: e?.message ?? "Unable to authenticate phone" }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to verify OTP"
      this.logger_.error(`Twilio OTP verify failed: ${message}`)
      return { success: false, error: message }
    }
  }
}

