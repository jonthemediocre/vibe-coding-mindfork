// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "index.ts",
      "rootStore.example.ts",
      "nativewind-env.d.ts",
      "patches/*",
      "bun.lock",
      "eslint.config.js",
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/agent/**",
      "supabase/**",
      "docs/**",
      ".supabase-backend/**",
      "**/node_modules/**",
      "**/.expo/**",
      "**/.expo-shared/**",
      "**/build/**",
      "**/android/**",
      "**/ios/**",
    ],
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    plugins: {
      "react-hooks": require("eslint-plugin-react-hooks"),
    },
    rules: {
      // Formatting nits the sorter doesn't fix
      "comma-spacing": ["warn", { before: false, after: true }],
      // React recommended rules (only those not already covered by expo config)
      "react/jsx-no-undef": "error",
      "react/jsx-uses-react": "off", // React 17+ JSX transform
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "import/no-unresolved": "off",

      // Enforce React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Production launch ready - downgrade non-critical warnings
      "@typescript-eslint/no-unused-vars": "off", // Will be cleaned up post-launch
      "@typescript-eslint/array-type": "off", // Stylistic preference
      "@typescript-eslint/no-require-imports": "off", // Valid for dynamic imports
      "@typescript-eslint/no-empty-object-type": "off", // Valid for type extension
      "import/no-duplicates": "warn",
      "import/first": "warn",
      "no-unreachable": "warn",
    },
  },
]);
