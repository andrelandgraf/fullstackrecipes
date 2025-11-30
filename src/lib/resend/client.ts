import { Resend } from "resend";
import { resendConfig } from "./config";

export const resend = new Resend(resendConfig.apiKey);
