import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_meal_plans_days_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_meal_plans_meals_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TABLE "recipes_ingredients" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ingredient" varchar NOT NULL
  );
  
  CREATE TABLE "recipes_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "recipes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"prep_time" numeric,
  	"batchable" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "meal_plans_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_meal_plans_days_day" NOT NULL
  );
  
  CREATE TABLE "meal_plans_meals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_meal_plans_meals_day",
  	"meal" varchar NOT NULL,
  	"recipe_id" integer
  );
  
  CREATE TABLE "meal_plans_grocery_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "meal_plans_prep_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step" varchar NOT NULL
  );
  
  CREATE TABLE "meal_plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "recipes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "meal_plans_id" integer;
  ALTER TABLE "recipes_ingredients" ADD CONSTRAINT "recipes_ingredients_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recipes_tags" ADD CONSTRAINT "recipes_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meal_plans_days" ADD CONSTRAINT "meal_plans_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meal_plans_meals" ADD CONSTRAINT "meal_plans_meals_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "meal_plans_meals" ADD CONSTRAINT "meal_plans_meals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meal_plans_grocery_list" ADD CONSTRAINT "meal_plans_grocery_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "meal_plans_prep_steps" ADD CONSTRAINT "meal_plans_prep_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "recipes_ingredients_order_idx" ON "recipes_ingredients" USING btree ("_order");
  CREATE INDEX "recipes_ingredients_parent_id_idx" ON "recipes_ingredients" USING btree ("_parent_id");
  CREATE INDEX "recipes_tags_order_idx" ON "recipes_tags" USING btree ("_order");
  CREATE INDEX "recipes_tags_parent_id_idx" ON "recipes_tags" USING btree ("_parent_id");
  CREATE INDEX "recipes_updated_at_idx" ON "recipes" USING btree ("updated_at");
  CREATE INDEX "recipes_created_at_idx" ON "recipes" USING btree ("created_at");
  CREATE INDEX "meal_plans_days_order_idx" ON "meal_plans_days" USING btree ("_order");
  CREATE INDEX "meal_plans_days_parent_id_idx" ON "meal_plans_days" USING btree ("_parent_id");
  CREATE INDEX "meal_plans_meals_order_idx" ON "meal_plans_meals" USING btree ("_order");
  CREATE INDEX "meal_plans_meals_parent_id_idx" ON "meal_plans_meals" USING btree ("_parent_id");
  CREATE INDEX "meal_plans_meals_recipe_idx" ON "meal_plans_meals" USING btree ("recipe_id");
  CREATE INDEX "meal_plans_grocery_list_order_idx" ON "meal_plans_grocery_list" USING btree ("_order");
  CREATE INDEX "meal_plans_grocery_list_parent_id_idx" ON "meal_plans_grocery_list" USING btree ("_parent_id");
  CREATE INDEX "meal_plans_prep_steps_order_idx" ON "meal_plans_prep_steps" USING btree ("_order");
  CREATE INDEX "meal_plans_prep_steps_parent_id_idx" ON "meal_plans_prep_steps" USING btree ("_parent_id");
  CREATE INDEX "meal_plans_updated_at_idx" ON "meal_plans" USING btree ("updated_at");
  CREATE INDEX "meal_plans_created_at_idx" ON "meal_plans" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recipes_fk" FOREIGN KEY ("recipes_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_meal_plans_fk" FOREIGN KEY ("meal_plans_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_recipes_id_idx" ON "payload_locked_documents_rels" USING btree ("recipes_id");
  CREATE INDEX "payload_locked_documents_rels_meal_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("meal_plans_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "recipes_ingredients" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recipes_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recipes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "meal_plans_days" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "meal_plans_meals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "meal_plans_grocery_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "meal_plans_prep_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "meal_plans" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "recipes_ingredients" CASCADE;
  DROP TABLE "recipes_tags" CASCADE;
  DROP TABLE "recipes" CASCADE;
  DROP TABLE "meal_plans_days" CASCADE;
  DROP TABLE "meal_plans_meals" CASCADE;
  DROP TABLE "meal_plans_grocery_list" CASCADE;
  DROP TABLE "meal_plans_prep_steps" CASCADE;
  DROP TABLE "meal_plans" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recipes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_meal_plans_fk";
  
  DROP INDEX "payload_locked_documents_rels_recipes_id_idx";
  DROP INDEX "payload_locked_documents_rels_meal_plans_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "recipes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "meal_plans_id";
  DROP TYPE "public"."enum_meal_plans_days_day";
  DROP TYPE "public"."enum_meal_plans_meals_day";`)
}
