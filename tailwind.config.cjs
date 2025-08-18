/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  // Nếu muốn bật thủ công dark mode: dùng class "dark" trên <html>:
  // darkMode: "class",
  plugins: [],
};
