import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  loadEnv,
} from "@medusajs/framework/utils";
import {
  clearShiprocketAuthLockout,
  shiprocketLogin,
} from "../lib/shiprocket/client";

/**
 * Verifies Shiprocket API credentials the same way the subscriber does (loadEnv + apiv2 login).
 * Run: cd backend && npm run shiprocket:test-auth
 */
export default async function shiprocketTestAuth({ container }: ExecArgs) {
  loadEnv(process.env.NODE_ENV || "development", process.cwd());
  clearShiprocketAuthLockout();

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const email =
    process.env.SHIPROCKET_API_EMAIL?.trim() ||
    process.env.SHIPROCKET_EMAIL?.trim() ||
    "";
  const pass =
    process.env.SHIPROCKET_API_PASSWORD?.trim() ||
    process.env.SHIPROCKET_PASSWORD?.trim() ||
    "";

  logger.info(
    `shiprocket-test-auth: email configured=${Boolean(email)} password length=${pass.length} (first char code ${pass ? pass.charCodeAt(0) : "n/a"} — expect 36 for '$' if literal)`,
  );

  if (!email || !pass) {
    logger.error(
      "shiprocket-test-auth: missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD (or B64 / password file).",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const token = await shiprocketLogin();
    logger.info(
      `shiprocket-test-auth: SUCCESS — Shiprocket returned a token (${token.length} chars).`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error(`shiprocket-test-auth: FAILED — ${msg}`);
    if (/blocked|too many failed login/i.test(msg)) {
      logger.error(
        "shiprocket-test-auth: Shiprocket blocked this API user — wait 30–60+ min or reset the API password in Shiprocket. Do NOT re-run this script in a loop (it makes the block longer).",
      );
    } else {
      logger.error(
        "If password contains $, use \\$ per dollar in backend/.env (dotenv-expand), SHIPROCKET_API_PASSWORD_B64, or SHIPROCKET_API_PASSWORD_FILE.",
      );
    }
    process.exitCode = 1;
  }
}
