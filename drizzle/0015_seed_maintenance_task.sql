INSERT INTO "maintenance_task" ("key")
VALUES ('article_asset_cleanup')
ON CONFLICT ("key") DO NOTHING;
