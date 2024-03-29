import * as assert from 'assert'
import { Dispatch } from 'redux'

import {
  ActionErrorType,
  ActionSuccessType,
  errorActionType,
  startActionType,
  successActionType,
} from './index'
import {
  clearActionHistory,
  createWithMiddleware,
  getActionHistory,
} from './spec/helpers/store'

describe('Async/Await Middleware', () => {
  beforeEach(clearActionHistory)

  it('works when action is null', () => {
    const store = createWithMiddleware((state) => state)

    store.dispatch(null as any)
    store.dispatch(undefined as any)
    store.dispatch(0 as any)
  })

  describe('Success', () => {
    it('Works with function payload', async () => {
      const store = createWithMiddleware((state) => state)

      const result = await store.dispatch({
        type: 'foo',
        payload(dispatch: Dispatch<any>) {
          dispatch({ type: 'OMG' })

          return 'foo'
        },
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 3)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: 'OMG',
      })
      assert.deepStrictEqual(actionHistory[2], {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
      assert.deepStrictEqual(result, {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
    })

    it('Works with a regular payload', async () => {
      const store = createWithMiddleware((state) => state)

      const result = await store.dispatch({ type: 'OMG' })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 1)
      assert.deepStrictEqual(actionHistory[0], {
        type: 'OMG',
      })
      assert.deepStrictEqual(result, {
        type: 'OMG',
      })
    })

    it('Works with a promise payload', async () => {
      const store = createWithMiddleware((state) => state)

      const result = await store.dispatch({
        type: 'foo',
        payload: Promise.resolve('foo'),
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 2)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
      assert.deepStrictEqual(result, {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
    })

    it('Works with an async function', async () => {
      const store = createWithMiddleware((state) => state)

      const result = await store.dispatch({
        type: 'foo',
        async payload(dispatch: Dispatch<any>) {
          const payload = await Promise.resolve(42)
          dispatch({ payload, type: 'OMG' })

          return 'foo'
        },
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 3)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: 'OMG',
        payload: 42,
      })
      assert.deepStrictEqual(actionHistory[2], {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
      assert.deepStrictEqual(result, {
        type: successActionType('foo'),
        payload: 'foo',
        error: false,
        meta: undefined,
      })
    })

    it('Can skip start / success actions', async () => {
      const store = createWithMiddleware((state) => state)

      const result = await store.dispatch({
        type: 'foo',
        async payload(dispatch: Dispatch<any>) {
          const payload = await Promise.resolve(42)
          dispatch({ payload, type: 'OMG' })

          return 'foo'
        },
        meta: {
          asyncPayload: {
            skipOuter: true,
          },
        },
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 1)
      assert.deepStrictEqual(actionHistory[0], {
        type: 'OMG',
        payload: 42,
      })
      assert.equal(result, 'foo')
    })
  })

  describe('Error', () => {
    it('Works with function payload', async () => {
      const store = createWithMiddleware((state) => state)

      await store.dispatch({
        type: 'foo',
        payload(dispatch: Dispatch<any>) {
          dispatch({ type: 'OMG' })
          throw new Error('the error message')
        },
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 3)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: 'OMG',
      })
      assert.deepStrictEqual(actionHistory[2], {
        type: errorActionType('foo'),
        payload: 'the error message',
        error: true,
        meta: undefined,
      })
    })

    it('Works with a promise payload', async () => {
      const store = createWithMiddleware((state) => state)

      await store.dispatch({
        type: 'foo',
        payload: Promise.reject(new Error('the error message')),
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 2)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: errorActionType('foo'),
        payload: 'the error message',
        error: true,
        meta: undefined,
      })
    })

    it('Works with an async function', async () => {
      const store = createWithMiddleware((state) => state)

      await store.dispatch({
        type: 'foo',
        async payload(dispatch: Dispatch<any>) {
          const result = await Promise.reject(new Error('the error message'))
          dispatch({ type: 'OMG', payload: result })

          return 'foo'
        },
      })

      const actionHistory = getActionHistory()

      assert.equal(actionHistory.length, 2)
      assert.deepStrictEqual(actionHistory[0], {
        type: startActionType('foo'),
        error: undefined,
        meta: undefined,
      })
      assert.deepStrictEqual(actionHistory[1], {
        type: errorActionType('foo'),
        payload: 'the error message',
        error: true,
        meta: undefined,
      })
    })
  })

  describe('dispatch()', () => {
    it('can be cast to ActionSuccessType', async () => {
      const store = createWithMiddleware((state) => state)

      const action = () => ({
        type: 'foo',
        payload(dispatch: Dispatch<any>) {
          dispatch({ type: 'OMG' })

          return 'foo'
        },
      })

      const result = ((await store.dispatch(
        action(),
      )) as any) as ActionSuccessType<typeof action>

      assert.strictEqual(result.type, successActionType('foo'))
      assert.strictEqual(result.payload, 'foo')
      assert.strictEqual(result.error, false)
    })

    it('can be cast to ActionErrorType', async () => {
      const store = createWithMiddleware((state) => state)

      const action = () => ({
        type: 'foo',
        payload() {
          throw new Error()
        },
      })

      const result = ((await store.dispatch(
        action(),
      )) as any) as ActionErrorType<typeof action>

      assert.strictEqual(result.type, errorActionType('foo'))
      assert.strictEqual(result.payload, 'Error')
      assert.strictEqual(result.error, true)
    })
  })
})
