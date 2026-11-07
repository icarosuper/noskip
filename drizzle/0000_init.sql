CREATE TYPE "public"."season" AS ENUM('WINTER', 'SPRING', 'SUMMER', 'FALL');--> statement-breakpoint
CREATE TYPE "public"."theme_type" AS ENUM('OP', 'ED', 'IN');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"username" text,
	"display_username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anime" (
	"id" serial PRIMARY KEY NOT NULL,
	"animethemes_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title_romaji" text NOT NULL,
	"title_english" text,
	"title_native" text,
	"format" text,
	"year" integer,
	"season" "season",
	"synopsis" text,
	"cover_small_url" text,
	"cover_large_url" text,
	"anilist_id" integer,
	"mal_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist" (
	"id" serial PRIMARY KEY NOT NULL,
	"animethemes_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_native" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song" (
	"id" serial PRIMARY KEY NOT NULL,
	"animethemes_id" integer NOT NULL,
	"title_romaji" text,
	"title_native" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_artist" (
	"song_id" integer NOT NULL,
	"artist_id" integer NOT NULL,
	"credited_as" text,
	CONSTRAINT "song_artist_song_id_artist_id_pk" PRIMARY KEY("song_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "theme" (
	"id" serial PRIMARY KEY NOT NULL,
	"animethemes_id" integer NOT NULL,
	"anime_id" integer NOT NULL,
	"song_id" integer,
	"type" "theme_type" NOT NULL,
	"sequence" integer,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"user_id" text NOT NULL,
	"theme_id" integer NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_user_id_theme_id_pk" PRIMARY KEY("user_id","theme_id"),
	CONSTRAINT "rating_score_range" CHECK ("rating"."score" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_artist" ADD CONSTRAINT "song_artist_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_artist" ADD CONSTRAINT "song_artist_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme" ADD CONSTRAINT "theme_anime_id_anime_id_fk" FOREIGN KEY ("anime_id") REFERENCES "public"."anime"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme" ADD CONSTRAINT "theme_song_id_song_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."song"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_theme_id_theme_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_animethemes_id_idx" ON "anime" USING btree ("animethemes_id");--> statement-breakpoint
CREATE UNIQUE INDEX "anime_slug_idx" ON "anime" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "anime_year_season_idx" ON "anime" USING btree ("year","season");--> statement-breakpoint
CREATE INDEX "anime_anilist_id_idx" ON "anime" USING btree ("anilist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_animethemes_id_idx" ON "artist" USING btree ("animethemes_id");--> statement-breakpoint
CREATE UNIQUE INDEX "song_animethemes_id_idx" ON "song" USING btree ("animethemes_id");--> statement-breakpoint
CREATE UNIQUE INDEX "theme_animethemes_id_idx" ON "theme" USING btree ("animethemes_id");--> statement-breakpoint
CREATE INDEX "theme_anime_id_idx" ON "theme" USING btree ("anime_id");--> statement-breakpoint
CREATE INDEX "rating_theme_id_idx" ON "rating" USING btree ("theme_id");