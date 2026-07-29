import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./lib/db/schema/auth.generated.ts",
    "./lib/db/schema/article.ts",
  ],
  out: "./drizzle",
});
