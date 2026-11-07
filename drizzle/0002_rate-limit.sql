CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp NOT NULL,
	"hits" integer NOT NULL
);
