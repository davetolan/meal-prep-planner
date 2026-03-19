import { getPayload } from 'payload'
import config from '@payload-config'

import { importRecipes } from '@/utilities/importRecipes'

const payload = await getPayload({ config })

try {
  const result = await importRecipes({ payload })
  payload.logger.info(`Imported recipes: created=${result.created}, updated=${result.updated}, total=${result.total}`)
} finally {
  await payload.destroy()
}
