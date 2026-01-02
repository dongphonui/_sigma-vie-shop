// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // thêm các biến môi trường khác nếu cần
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
