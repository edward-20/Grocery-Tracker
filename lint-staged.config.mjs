export default {
  "*.{js,cjs,mjs,ts,tsx,svelte,css,html,json,yaml,yml,md}": "prettier --write",
  "apps/frontend/**/*.{js,cjs,mjs,ts,tsx,svelte}":
    "pnpm --dir apps/frontend exec eslint",
};
