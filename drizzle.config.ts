import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./lib/db/schema/auth.generated.ts",
    "./lib/db/schema/article.ts",
    "./lib/db/schema/article-asset.ts",
    "./lib/db/schema/article-taxonomy.ts",
    "./lib/db/schema/maintenance-task.ts",
  ],
  out: "./drizzle",
});
