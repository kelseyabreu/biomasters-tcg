import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5174",
    pageLoadTimeout: 120000, // 2 minutes
    defaultCommandTimeout: 10000, // 10 seconds
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});