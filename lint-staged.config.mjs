const quoteFiles = (files) => files.map(JSON.stringify).join(" ");

const sourceFiles = (files) =>
  files.filter((file) => !file.includes("/fixtures/"));

const formatFiles = (files) => {
  const filesToFormat = sourceFiles(files);
  const frontendFiles = filesToFormat.filter((file) =>
    file.includes("/apps/frontend/"),
  );
  const otherFiles = filesToFormat.filter(
    (file) => !file.includes("/apps/frontend/"),
  );

  return [
    otherFiles.length > 0 && `prettier --write ${quoteFiles(otherFiles)}`,
    frontendFiles.length > 0 &&
      `pnpm --dir apps/frontend exec prettier --write ${quoteFiles(frontendFiles)}`,
  ].filter(Boolean);
};

const lintFrontendFiles = (files) => {
  const filesToLint = sourceFiles(files);

  return filesToLint.length > 0
    ? `pnpm --dir apps/frontend exec eslint ${quoteFiles(filesToLint)}`
    : [];
};

export default {
  "*.{js,cjs,mjs,ts,tsx,svelte,css,html,json,yaml,yml,md}": formatFiles,
  "apps/frontend/**/*.{js,cjs,mjs,ts,tsx,svelte}": lintFrontendFiles,
};
