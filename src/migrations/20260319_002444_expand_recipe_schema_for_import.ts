import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "recipes_instructions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step" varchar NOT NULL
  );
  
  CREATE TABLE "recipes_batch_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"note" varchar NOT NULL
  );
  
  CREATE TABLE "recipes_meal_variations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variation" varchar NOT NULL
  );
  
  ALTER TABLE "recipes_ingredients" RENAME COLUMN "ingredient" TO "name";
  ALTER TABLE "recipes_ingredients" ADD COLUMN "quantity" varchar;
  ALTER TABLE "recipes_ingredients" ADD COLUMN "category" varchar;
  ALTER TABLE "recipes" ADD COLUMN "source_id" varchar NOT NULL;
  ALTER TABLE "recipes" ADD COLUMN "description" varchar;
  ALTER TABLE "recipes" ADD COLUMN "servings" numeric;
  ALTER TABLE "recipes" ADD COLUMN "cook_time" numeric;
  ALTER TABLE "recipes" ADD COLUMN "storage_fridge_days" numeric;
  ALTER TABLE "recipes" ADD COLUMN "storage_freezer_days" numeric;
  ALTER TABLE "recipes" ADD COLUMN "storage_reheat_instructions" varchar;
  ALTER TABLE "recipes" ADD COLUMN "estimated_protein_per_serving" numeric;
  ALTER TABLE "recipes_instructions" ADD CONSTRAINT "recipes_instructions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recipes_batch_notes" ADD CONSTRAINT "recipes_batch_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recipes_meal_variations" ADD CONSTRAINT "recipes_meal_variations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "recipes_instructions_order_idx" ON "recipes_instructions" USING btree ("_order");
  CREATE INDEX "recipes_instructions_parent_id_idx" ON "recipes_instructions" USING btree ("_parent_id");
  CREATE INDEX "recipes_batch_notes_order_idx" ON "recipes_batch_notes" USING btree ("_order");
  CREATE INDEX "recipes_batch_notes_parent_id_idx" ON "recipes_batch_notes" USING btree ("_parent_id");
  CREATE INDEX "recipes_meal_variations_order_idx" ON "recipes_meal_variations" USING btree ("_order");
  CREATE INDEX "recipes_meal_variations_parent_id_idx" ON "recipes_meal_variations" USING btree ("_parent_id");
  CREATE INDEX "recipes_source_id_idx" ON "recipes" USING btree ("source_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "recipes_instructions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recipes_batch_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recipes_meal_variations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "recipes_instructions" CASCADE;
  DROP TABLE "recipes_batch_notes" CASCADE;
  DROP TABLE "recipes_meal_variations" CASCADE;
  ALTER TABLE "recipes_ingredients" RENAME COLUMN "name" TO "ingredient";
  DROP INDEX "recipes_source_id_idx";
  ALTER TABLE "recipes_ingredients" DROP COLUMN "quantity";
  ALTER TABLE "recipes_ingredients" DROP COLUMN "category";
  ALTER TABLE "recipes" DROP COLUMN "source_id";
  ALTER TABLE "recipes" DROP COLUMN "description";
  ALTER TABLE "recipes" DROP COLUMN "servings";
  ALTER TABLE "recipes" DROP COLUMN "cook_time";
  ALTER TABLE "recipes" DROP COLUMN "storage_fridge_days";
  ALTER TABLE "recipes" DROP COLUMN "storage_freezer_days";
  ALTER TABLE "recipes" DROP COLUMN "storage_reheat_instructions";
  ALTER TABLE "recipes" DROP COLUMN "estimated_protein_per_serving";`)
}
