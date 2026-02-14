/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    dark: "#0f172a",
                    primary: "#3b82f6",
                    accent: "#10b981",
                }
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            }
        },
    },
    plugins: [],
}
