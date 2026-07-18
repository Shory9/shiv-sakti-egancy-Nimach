import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["app-icon.png"],

      manifest: {
        name: "Shiv Sakti Recovery",
        short_name: "SSR CRM",

        description: "Shiv Sakti Recovery Agency Management System",

        theme_color: "#061a2e",
        background_color: "#ffffff",

        display: "standalone",

        orientation: "portrait",

        start_url: "/",

        icons: [
          {
            src: "/app-icon.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/app-icon.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/app-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ]
});