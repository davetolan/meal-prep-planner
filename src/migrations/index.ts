import * as migration_20260318_025836_initial_schema from './20260318_025836_initial_schema';
import * as migration_20260318_030121_add_recipes_and_meal_plans from './20260318_030121_add_recipes_and_meal_plans';
import * as migration_20260319_002444_expand_recipe_schema_for_import from './20260319_002444_expand_recipe_schema_for_import';

export const migrations = [
  {
    up: migration_20260318_025836_initial_schema.up,
    down: migration_20260318_025836_initial_schema.down,
    name: '20260318_025836_initial_schema',
  },
  {
    up: migration_20260318_030121_add_recipes_and_meal_plans.up,
    down: migration_20260318_030121_add_recipes_and_meal_plans.down,
    name: '20260318_030121_add_recipes_and_meal_plans',
  },
  {
    up: migration_20260319_002444_expand_recipe_schema_for_import.up,
    down: migration_20260319_002444_expand_recipe_schema_for_import.down,
    name: '20260319_002444_expand_recipe_schema_for_import'
  },
];
