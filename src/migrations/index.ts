import * as migration_20260318_025836_initial_schema from './20260318_025836_initial_schema';
import * as migration_20260318_030121_add_recipes_and_meal_plans from './20260318_030121_add_recipes_and_meal_plans';

export const migrations = [
  {
    up: migration_20260318_025836_initial_schema.up,
    down: migration_20260318_025836_initial_schema.down,
    name: '20260318_025836_initial_schema',
  },
  {
    up: migration_20260318_030121_add_recipes_and_meal_plans.up,
    down: migration_20260318_030121_add_recipes_and_meal_plans.down,
    name: '20260318_030121_add_recipes_and_meal_plans'
  },
];
