CREATE TABLE "favorite" (
	"user_id" text NOT NULL,
	"theme_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_user_id_theme_id_pk" PRIMARY KEY("user_id","theme_id"),
	CONSTRAINT "favorite_user_position_unique" UNIQUE("user_id","position"),
	CONSTRAINT "favorite_position_range" CHECK ("favorite"."position" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "review" (
	"user_id" text NOT NULL,
	"theme_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_user_id_theme_id_pk" PRIMARY KEY("user_id","theme_id"),
	CONSTRAINT "review_body_length" CHECK (char_length("review"."body") between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "review_report" (
	"reporter_id" text NOT NULL,
	"review_user_id" text NOT NULL,
	"theme_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_report_reporter_id_review_user_id_theme_id_pk" PRIMARY KEY("reporter_id","review_user_id","theme_id")
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follow_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "follow_not_self" CHECK ("follow"."follower_id" <> "follow"."following_id")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"show_spoilers" boolean DEFAULT false NOT NULL,
	"show_nsfw" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_bio_length" CHECK (char_length("profile"."bio") <= 160)
);
--> statement-breakpoint
ALTER TABLE "theme" ADD COLUMN "spoiler" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "theme" ADD COLUMN "nsfw" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_theme_id_theme_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."theme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_theme_id_rating_user_id_theme_id_fk" FOREIGN KEY ("user_id","theme_id") REFERENCES "public"."rating"("user_id","theme_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_report" ADD CONSTRAINT "review_report_review_user_id_theme_id_review_user_id_theme_id_fk" FOREIGN KEY ("review_user_id","theme_id") REFERENCES "public"."review"("user_id","theme_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_theme_id_idx" ON "review" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "follow_following_id_idx" ON "follow" USING btree ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_slug_idx" ON "artist" USING btree ("slug");