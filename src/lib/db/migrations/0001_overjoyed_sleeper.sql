CREATE TABLE "recipe_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" text NOT NULL,
	"built_in_slug" text,
	"user_recipe_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_recipes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_bookmarks" ADD CONSTRAINT "recipe_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_bookmarks" ADD CONSTRAINT "recipe_bookmarks_user_recipe_id_user_recipes_id_fk" FOREIGN KEY ("user_recipe_id") REFERENCES "public"."user_recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recipes" ADD CONSTRAINT "user_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_bookmarks_userId_idx" ON "recipe_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_bookmarks_userId_builtIn_idx" ON "recipe_bookmarks" USING btree ("user_id","built_in_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_bookmarks_userId_userRecipe_idx" ON "recipe_bookmarks" USING btree ("user_id","user_recipe_id");--> statement-breakpoint
CREATE INDEX "user_recipes_userId_idx" ON "user_recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_recipes_isPublic_idx" ON "user_recipes" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "user_recipes_userId_slug_idx" ON "user_recipes" USING btree ("user_id","slug");