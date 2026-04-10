import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { TwilioPhoneAuthService } from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [TwilioPhoneAuthService],
})

