/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  /** Google Analytics measurement id (`G-XXXXXXX`). Optional — analytics is off when unset. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Microsoft Clarity project id. Optional — analytics is off when unset. */
  readonly VITE_CLARITY_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const src: string;
  export default src;
}
