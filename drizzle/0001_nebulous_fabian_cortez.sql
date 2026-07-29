ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
	IF (SELECT count(*) FROM "user") > 1 THEN
		RAISE EXCEPTION 'Cannot migrate admin role: expected at most one existing user';
	END IF;

	UPDATE "user" SET "role" = 'admin';
END
$$;
