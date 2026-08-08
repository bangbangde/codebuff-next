CREATE TABLE "maintenance_task" (
	"key" text PRIMARY KEY NOT NULL,
	"next_eligible_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_started_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
