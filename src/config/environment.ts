const env = (import.meta as any).env || {};

export const appEnv = env.VITE_APP_ENV || "prototype";

export const isPrototypeMode = appEnv === "prototype";
export const isProductionMode = appEnv === "production";

export const isDemoModeEnabled =
  isPrototypeMode && env.VITE_DEMO_MODE === "true";

export const canShowDeveloperTools =
  isPrototypeMode && isDemoModeEnabled;
