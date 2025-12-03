import { flag } from "flags/next";

export const featureFlagsGuideFlag = flag({
  key: "feature-flags-guide",
  decide() {
    // Always enabled - this is a standalone guide with no prerequisites
    return true;
  },
});
