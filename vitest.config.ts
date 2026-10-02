import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "npm:@supabase/supabase-js@2.117.2": path.resolve(
        "node_modules/@supabase/supabase-js/dist/index.mjs",
      ),
    },
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 15000 },
});
