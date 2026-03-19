import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

import { importRecipes } from '@/utilities/importRecipes'

export const maxDuration = 60

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const req = await createLocalReq({ user }, payload)
    const result = await importRecipes({ payload, req })

    return Response.json({ success: true, ...result })
  } catch (error) {
    payload.logger.error({ err: error, message: 'Error importing recipes' })
    return new Response('Error importing recipes.', { status: 500 })
  }
}
