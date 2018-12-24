import { Action, Middleware } from 'redux'

export interface MiddlewareOptions {
  delimiter?: string
  throwOriginalError: boolean
  suffixes?: MiddlewareSuffixes
}

export interface MiddlewareSuffixes {
  start?: string
  success?: string
  error?: string
}

export interface FluxAction extends Action {
  payload?: any
  meta?: any
  error?: boolean
}

export type PayloadType<T> =
  // If T is a function that returns a promise, infer U from Promise.
  T extends (...args: any[]) => Promise<infer U>
    ? U // If T is a function, infer U from its return type
    : T extends (...args: any[]) => infer U
    ? U // If T is just a promise, infer U.
    : T extends Promise<infer U>
    ? U
    : T

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export type ActionStartType<
  F extends (...args: any[]) => { payload: any }
> = Omit<ReturnType<F>, 'payload'>

export type ActionSuccessType<
  F extends (...args: any[]) => { payload: any }
> = Omit<ReturnType<F>, 'payload'> & {
  payload: PayloadType<ReturnType<F>['payload']>
  error: false
}

export type ActionErrorType<
  F extends (...args: any[]) => { payload: any }
> = Omit<ReturnType<F>, 'payload'> & {
  payload: string
  error: true
}

const defaultOptions: MiddlewareOptions = {
  delimiter: '/',
  throwOriginalError: true,
  suffixes: {
    start: 'start',
    success: 'success',
    error: 'error',
  },
}

/**
 * Checks if the argument given is a Promise or Promise-like object.
 */
function isPromise(promiseLike: any): boolean {
  if (promiseLike && typeof promiseLike.then === 'function') {
    return true
  }

  return false
}

/**
 * Middleware adding native async / await support to Redux.
 */
export default function asyncAwaitMiddleware(
  options?: MiddlewareOptions,
): Middleware {
  // Merge given options and our defaults.
  let opts: MiddlewareOptions = defaultOptions

  if (options) {
    opts = {
      ...defaultOptions,
      ...options,
    }
    opts.suffixes = {
      ...defaultOptions.suffixes,
      ...options.suffixes,
    }
  }

  return (store) => (dispatch) => (action) => {
    let didError = false

    /**
     * Check if start / success actions should be skipped.
     */
    function shouldSkipOuter() {
      if (
        action &&
        action.meta &&
        action.meta.asyncPayload &&
        action.meta.asyncPayload.skipOuter
      ) {
        return true
      }

      return false
    }

    /**
     * Dispatches the start action.
     */
    function dispatchPendingAction() {
      if (shouldSkipOuter()) {
        return
      }

      dispatch({
        type: `${action.type}${opts.delimiter}${opts.suffixes!.start}`,
        error: action.error,
        meta: action.meta,
      })
    }

    /**
     * Dispatches the success action and passes the payload along.
     */
    function dispatchFulfilledAction(payload: any) {
      if (didError) {
        return
      }

      if (shouldSkipOuter()) {
        return payload
      }

      return store.dispatch({
        payload,
        type: `${action.type}${opts.delimiter}${opts.suffixes!.success}`,
        error: false,
        meta: action.meta,
      })
    }

    /**
     * Dispatches the error action, sets `error` to `true`, and passes the
     * error as the payload.
     */
    function dispatchRejectedAction(err: Error) {
      didError = true

      const result = store.dispatch({
        type: `${action.type}${opts.delimiter}${opts.suffixes!.error}`,
        payload: (err.message || err || '').toString(),
        error: true,
        meta: action.meta,
      })

      if (opts.throwOriginalError) {
        throw err
      }

      return result
    }

    /**
     * Attaches fulfilled / error handlers to a promise while still throwing
     * the original error.
     */
    function attachHandlers(promise: Promise<any>): Promise<any> {
      return promise.then(dispatchFulfilledAction).catch(dispatchRejectedAction)
    }

    // Return if there is no action or payload.
    if (!action || !action.payload) {
      return dispatch(action)
    }

    // If the payload is already a promise, IE `fetch('http://...')`
    // dispatch the start action while returning the promise with our
    // success / error handlers.
    if (isPromise(action.payload)) {
      dispatchPendingAction()

      return attachHandlers(action.payload)
    }

    // If the payload is a function dispatch the start action and call the
    // function with `dispatch` and `getState` as arguments.
    // If the result is not a promise, just turn it into one, attach our
    // success / error handlers, and return it.
    if (typeof action.payload === 'function') {
      dispatchPendingAction()
      let result: any = null

      try {
        result = action.payload(store.dispatch, store.getState)
      } catch (err) {
        const errorResult = dispatchRejectedAction(err)

        if (!opts.throwOriginalError) {
          return errorResult
        }
      }

      if (!isPromise(result)) {
        result = Promise.resolve(result)
      }

      return attachHandlers(result)
    }

    // Just pass the action along if we've somehow gotten here.
    return dispatch(action)
  }
}
