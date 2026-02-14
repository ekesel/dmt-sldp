import type { Config } from "tailwindcss";
import sharedConfig from "../../packages/ui/tailwind.config.js";

const config: Config = {
    ...sharedConfig,
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}",
    ],
};

export default config;
