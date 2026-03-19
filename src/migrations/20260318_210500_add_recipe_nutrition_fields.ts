import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "recipes" ADD COLUMN "calories_per_serving" numeric;
    ALTER TABLE "recipes" ADD COLUMN "protein_per_serving" numeric;
    ALTER TABLE "recipes" ADD COLUMN "carbs_per_serving" numeric;
    ALTER TABLE "recipes" ADD COLUMN "fat_per_serving" numeric;

    UPDATE "recipes"
    SET "protein_per_serving" = "estimated_protein_per_serving"
    WHERE "protein_per_serving" IS NULL AND "estimated_protein_per_serving" IS NOT NULL;

    ALTER TABLE "recipes" DROP COLUMN "estimated_protein_per_serving";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "recipes" ADD COLUMN "estimated_protein_per_serving" numeric;

    UPDATE "recipes"
    SET "estimated_protein_per_serving" = "protein_per_serving"
    WHERE "estimated_protein_per_serving" IS NULL AND "protein_per_serving" IS NOT NULL;

    ALTER TABLE "recipes" DROP COLUMN "calories_per_serving";
    ALTER TABLE "recipes" DROP COLUMN "protein_per_serving";
    ALTER TABLE "recipes" DROP COLUMN "carbs_per_serving";
    ALTER TABLE "recipes" DROP COLUMN "fat_per_serving";
  `)
}
