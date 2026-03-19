import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

export const Recipes: CollectionConfig = {
  slug: 'recipes',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: [
      'name',
      'sourceId',
      'prepTime',
      'estimatedProteinPerServing',
      'batchable',
      'updatedAt',
    ],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'sourceId',
      type: 'text',
      index: true,
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'servings',
      type: 'number',
      min: 1,
    },
    {
      name: 'ingredients',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'quantity',
          type: 'text',
        },
        {
          name: 'category',
          type: 'text',
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'prepTime',
      type: 'number',
      min: 0,
      admin: {
        description: 'Prep time in minutes.',
      },
    },
    {
      name: 'cookTime',
      type: 'number',
      min: 0,
      admin: {
        description: 'Cook time in minutes.',
      },
    },
    {
      name: 'batchable',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'instructions',
      type: 'array',
      fields: [
        {
          name: 'step',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      name: 'storage',
      type: 'group',
      fields: [
        {
          name: 'fridgeDays',
          type: 'number',
          min: 0,
        },
        {
          name: 'freezerDays',
          type: 'number',
          min: 0,
        },
        {
          name: 'reheatInstructions',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'batchNotes',
      type: 'array',
      fields: [
        {
          name: 'note',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      name: 'mealVariations',
      type: 'array',
      fields: [
        {
          name: 'variation',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'estimatedProteinPerServing',
      type: 'number',
      min: 0,
    },
  ],
  timestamps: true,
}
