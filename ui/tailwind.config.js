/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../index.html",
    "../reglamento.html",
    "../js/**/*.js",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: { extend: {} },
  prefix: "tw-",
  plugins: [],
  corePlugins: { preflight: false },
};
