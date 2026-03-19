import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const weekdayOptions = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
]

export const MealPlans: CollectionConfig = {
  slug: 'meal-plans',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'updatedAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'days',
      type: 'array',
      fields: [
        {
          name: 'day',
          type: 'select',
          options: weekdayOptions,
          required: true,
        },
      ],
    },
    {
      name: 'meals',
      type: 'array',
      fields: [
        {
          name: 'day',
          type: 'select',
          options: weekdayOptions,
        },
        {
          name: 'meal',
          type: 'text',
          required: true,
        },
        {
          name: 'recipe',
          type: 'relationship',
          relationTo: 'recipes',
        },
      ],
    },
    {
      name: 'groceryList',
      type: 'array',
      fields: [
        {
          name: 'item',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'prepSteps',
      type: 'array',
      fields: [
        {
          name: 'step',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
  timestamps: true,
}
