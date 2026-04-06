import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // localStorage hydration in useEffect is a valid SSR-safe pattern
      "react-hooks/set-state-in-effect": "off",
      // False positive: app router does not use pages/_document.js
      "@next/next/no-page-custom-font": "off",
      // TanStack Table returns non-memoizable functions by design
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    ignores: ["convex/_generated/**"],
  },
];

export default eslintConfig;
