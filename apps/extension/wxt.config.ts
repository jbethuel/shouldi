import { defineConfig } from "wxt";

export default defineConfig({
  // A visible folder, so "Load unpacked" in Chrome can find it.
  outDir: "build",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Should I Apply?",
    description: "See how your resume matches a job.",
    // No host permissions: the API allows the extension through CORS.
    permissions: ["activeTab", "scripting", "storage"],
    action: { default_title: "Should I Apply?" },
  },
});
