import { closeDatabase, prepareDatabase } from './database'
import { TEST_DATABASE_URL } from './env'

// Runs once before the integration project: create noskip_test if needed and migrate it.
export default async function setup() {
  const database = await prepareDatabase(TEST_DATABASE_URL)
  await closeDatabase(database)
}
