import { assert } from 'chai'

describe('/src/index.ts', () => {
  it('should be able to be imported', async () => {
    const module = await import('../../src/index.js')
    assert.isOk(module)
  })
})
