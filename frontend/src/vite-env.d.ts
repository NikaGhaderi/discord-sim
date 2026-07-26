/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL. Empty string means same-origin relative paths (frontend served behind the same Nginx as the API). */
  readonly VITE_API_BASE_URL?: string;
  /** When "true", identity/index.ts serves mockApi instead of the real api.ts. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
