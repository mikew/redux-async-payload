import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux'

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

interface ActionContext {
  didError: boolean
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

let currentOptions: MiddlewareOptions

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

  currentOptions = opts

  return (store) => (dispatch) => (action) => {
    const context: ActionContext = {
      didError: false,
    }

    // Return if there is no action or payload.
    if (!action || !action.payload) {
      return dispatch(action)
    }

    // If the payload is already a promise, IE `fetch('http://...')`
    // dispatch the start action while returning the promise with our
    // success / error handlers.
    if (isPromise(action.payload)) {
      dispatchPendingAction(dispatch, action)

      return attachHandlers(context, store, action, action.payload)
    }

    // If the payload is a function dispatch the start action and call the
    // function with `dispatch` and `getState` as arguments.
    // If the result is not a promise, just turn it into one, attach our
    // success / error handlers, and return it.
    if (typeof action.payload === 'function') {
      dispatchPendingAction(dispatch, action)
      let result: any = null

      try {
        result = action.payload(store.dispatch, store.getState)
      } catch (err) {
        const errorResult = dispatchRejectedAction(context, store, action, err)

        if (!currentOptions.throwOriginalError) {
          return errorResult
        }
      }

      if (!isPromise(result)) {
        result = Promise.resolve(result)
      }

      return attachHandlers(context, store, action, result)
    }

    // Just pass the action along if we've somehow gotten here.
    return dispatch(action)
  }
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
 * Check if start / success actions should be skipped.
 */
function shouldSkipOuter(action: any) {
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
function dispatchPendingAction(dispatch: Dispatch<AnyAction>, action: any) {
  if (shouldSkipOuter(action)) {
    return
  }

  dispatch({
    type: startActionType(action.type),
    error: action.error,
    meta: action.meta,
  })
}

/**
 * Dispatches the success action and passes the payload along.
 */
function dispatchFulfilledAction(
  context: ActionContext,
  store: MiddlewareAPI,
  action: any,
  payload: any,
) {
  if (context.didError) {
    return
  }

  if (shouldSkipOuter(action)) {
    return payload
  }

  return store.dispatch({
    payload,
    type: successActionType(action.type),
    error: false,
    meta: action.meta,
  })
}

/**
 * Dispatches the error action, sets `error` to `true`, and passes the
 * error as the payload.
 */
function dispatchRejectedAction(
  context: ActionContext,
  store: MiddlewareAPI,
  action: any,
  err: Error,
) {
  context.didError = true

  const result = store.dispatch({
    type: errorActionType(action.type),
    payload: (err.message || err || '').toString(),
    error: true,
    meta: action.meta,
  })

  if (currentOptions.throwOriginalError) {
    throw err
  }

  return result
}

/**
 * Attaches fulfilled / error handlers to a promise while still throwing
 * the original error.
 */
function attachHandlers(
  context: ActionContext,
  store: MiddlewareAPI,
  action: any,
  promise: Promise<any>,
): Promise<any> {
  return promise
    .then((payload) => dispatchFulfilledAction(context, store, action, payload))
    .catch((err) => dispatchRejectedAction(context, store, action, err))
}
