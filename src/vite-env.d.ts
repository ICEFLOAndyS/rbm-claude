/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** MUI X Pro licence key (decision D4). Optional: without it the grid shows a development watermark. */
  readonly VITE_MUI_X_LICENSE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
