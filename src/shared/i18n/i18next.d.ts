import "i18next";
import type { resources } from "./index";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "ui";
    resources: (typeof resources)["en"];
    strictKeyChecks: true;
  }
}
