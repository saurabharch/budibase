import { faker } from "@faker-js/faker"
import {
  generateMakeRequest,
  MakeRequestResponse,
} from "../api/routes/public/tests/utils"

import * as setup from "../api/routes/tests/utilities"
import supertest from "supertest"
import { Datasource, FieldType, SourceName } from "@budibase/types"

const config = setup.getConfig()
let apiKey,
  table,
  app,
  makeRequest: MakeRequestResponse,
  postgresDatasource: Datasource

beforeAll(async () => {
  app = await config.init()
  table = await config.updateTable()
  apiKey = await config.generateApiKey()
  postgresDatasource = await config.createDatasource({
    type: "datasource",
    source: SourceName.POSTGRES,
    plus: true,
    config: {
      host: "192.168.1.98",
      port: 54321,
      database: "postgres",
      user: "root",
      password: "root",
      schema: "public",
      ssl: false,
      rejectUnauthorized: false,
      ca: false,
    },
  })
  makeRequest = generateMakeRequest(apiKey)
})

afterAll(async () => {
  require("../app").default
  await config.end()
})

describe("row api", () => {
  let request: supertest.SuperTest<supertest.Test>
  let server: any

  beforeAll(() => {
    server = require("../app").default
  })
  afterAll(() => {
    server.close()
  })

  beforeEach(async () => {
    request = supertest(server)
  })

  describe("create a row", () => {
    test("Given than no row exists, adding a new rows persists it", async () => {
      const tableName = faker.lorem.word()

      const table = await config.createTable({
        name: tableName,
        schema: {
          name: {
            name: "name",
            type: FieldType.STRING,
          },
          description: {
            name: "description",
            type: FieldType.STRING,
          },
          value: {
            name: "value",
            type: FieldType.NUMBER,
          },
        },
        sourceId: postgresDatasource._id,
      })

      const newRow = {
        name: faker.name.fullName(),
        description: faker.lorem.paragraphs(),
        value: +faker.random.numeric(),
      }

      const res = await makeRequest("post", `/tables/${table._id}/rows`, newRow)

      expect(res.status).toBe(200)

      const persistedRows = await config.getRows(table._id!)
      expect(persistedRows).toHaveLength(1)
      expect(persistedRows).toEqual([
        expect.objectContaining({
          ...res.body.data,
          ...newRow,
        }),
      ])
    })

    test("Given than no row exists, multiple rows can be persisted", async () => {
      const tableName = faker.lorem.word()

      const table = await config.createTable({
        name: tableName,
        schema: {
          name: {
            name: "name",
            type: FieldType.STRING,
          },
          description: {
            name: "description",
            type: FieldType.STRING,
          },
          value: {
            name: "value",
            type: FieldType.NUMBER,
          },
        },
        sourceId: postgresDatasource._id,
      })

      const numberOfRows = 10
      const newRows = Array(numberOfRows).map(() => ({
        name: faker.name.fullName(),
        description: faker.lorem.paragraphs(),
        value: +faker.random.numeric(),
      }))

      for (const newRow of newRows) {
        const res = await makeRequest(
          "post",
          `/tables/${table._id}/rows`,
          newRow
        )
        expect(res.status).toBe(200)
      }

      const persistedRows = await config.getRows(table._id!)
      expect(persistedRows).toHaveLength(numberOfRows)
      expect(persistedRows).toEqual(expect.arrayContaining(newRows))
    })
  })
})
