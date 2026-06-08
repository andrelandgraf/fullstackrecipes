import { flag } from "flags/next";
import { stripeConfig } from "./config";

export const stripeFlag = flag({
  key: "stripe-enabled",
  decide() {
    return stripeConfig.isEnabled;
  },
});
