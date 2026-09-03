const env = (import.meta as any).env || {};

export const appEnv = env.VITE_APP_ENV || "prototype";

export const isPrototypeMode = appEnv === "prototype";
export const isProductionMode = appEnv === "production";

export const isDemoModeEnabled =
  isPrototypeMode && env.VITE_DEMO_MODE === "true";

export const canShowDeveloperTools =
  isPrototypeMode && isDemoModeEnabled;

/**
 * Read-only external information system demo.
 *
 * Source selection is intentionally not exposed to React. The Integration API
 * chooses its adapter through the server-side EXTERNAL_DATA_SOURCE setting.
 */
export const isExternalApiDemoEnabled =
  env.VITE_EXTERNAL_API_DEMO_ENABLED === "true";
