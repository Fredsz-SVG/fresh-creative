import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'

describe('API basic', () => {
  it('should create a Hono app', () => {
    const app = new Hono()
    expect(app).toBeInstanceOf(Hono)
  })
})
