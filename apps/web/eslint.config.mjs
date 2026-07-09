import sharedConfig from "@venora/config/eslint-preset";

export default [
  ...sharedConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  }
];
