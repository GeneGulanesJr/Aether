/**
 * Validates sample fixture JSON against schema/catalog.schema.json and schema/prices.schema.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const catalogSchema = JSON.parse(
  fs.readFileSync(path.join(root, 'schema/catalog.schema.json'), 'utf8'),
)
const pricesSchema = JSON.parse(
  fs.readFileSync(path.join(root, 'schema/prices.schema.json'), 'utf8'),
)

const validateCatalog = ajv.compile(catalogSchema)
const validatePrices = ajv.compile(pricesSchema)

const checks = [
  ['data-fixtures/catalog/cpus.sample.json', validateCatalog],
  ['data-fixtures/prices/manifest.sample.json', validatePrices],
  ['data-fixtures/prices/entries.sample.json', validatePrices],
]

let ok = true
for (const [rel, validate] of checks) {
  const full = path.join(root, rel)
  const data = JSON.parse(fs.readFileSync(full, 'utf8'))
  if (!validate(data)) {
    console.error(`Schema validation failed: ${rel}`)
    console.error(validate.errors)
    ok = false
  } else {
    console.log(`OK ${rel}`)
  }
}

if (!ok) process.exit(1)
