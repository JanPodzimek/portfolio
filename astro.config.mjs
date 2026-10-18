// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // janpodzimek.wz.cz redirects here, so this is the canonical origin.
  site: 'https://portfolio-v2-sigma-two.vercel.app',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['en', 'cs'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  env: {
    schema: {
      // Set by Vercel at build time; Base.astro emits it so production can be matched to a commit.
      VERCEL_GIT_COMMIT_SHA: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        default: 'local',
      }),
    },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', cs: 'cs' } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
