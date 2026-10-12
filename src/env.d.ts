/// <reference path="../.astro/types.d.ts" />

declare module 'cloudflare:workers' {
  export const env: Record<string, any>;
}

declare var process: {
  env: Record<string, string | undefined>;
  versions?: {
    node?: string;
  };
};
