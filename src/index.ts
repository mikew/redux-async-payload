import {
  Action,
} from 'redux'

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
 * @param {any} promiseLike
 * @returns {boolean}
 */
function isPromise(promiseLike: any): boolean {
  if (promiseLike && typeof promiseLike.then === 'function') {
    return true
  }

  return false
}

/**
 * Middleware adding native async / await support to Redux.
 * @export
 * @param {MiddlewareOptions} options
 * @returns {Middleware}
 */
export default function asyncAwaitMiddleware(options?: MiddlewareOptions): Middleware {
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
    /**
     * Dispatches the start action.
     */
    function dispatchPendingAction() {
      dispatch({
        type: `${action.type}${opts.delimiter}${opts.suffixes!.start}`,
        error: action.error,
        meta: action.meta,
      })
    }

    /**
     * Dispatches the success action and passes the payload along.
     * @param {any} payload
     */
    function dispatchFulfilledAction(payload: any) {
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
     * @param {Error} err
     */
    function dispatchRejectedAction(err: Error) {
      store.dispatch({
        type: `${action.type}${opts.delimiter}${opts.suffixes!.error}`,
        payload: (err.message || err || '').toString(),
        error: true,
        meta: action.meta,
      })

      if (opts.throwOriginalError) {
        throw err
      }
    }

    /**
     * Attaches fulfilled / error handlers to a promise while still throwing
     * the original error.
     * @param {Promise<any>} promise
     * @returns {Promise<any>}
     */
    function attachHandlers(promise: Promise<any>) {
      return promise
        .then(dispatchFulfilledAction)
        .catch(dispatchRejectedAction)
    }

    // Return if there is no action or payload.
    if (
      !action
      || !action.payload
    ) {
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
        dispatchRejectedAction(err)
      }

      if (!isPromise(result)) {
        result = Promise.resolve(result)
      }

      return attachHandlers(result) as any
    }

    // Just pass the action along if we've somehow gotten here.
    return dispatch(action)
  }
}

// Dispatch, MiddlewareAPI, and Middleware are from the upcoming redux@4.0,
// which is mostly just better TypeScript types.
export interface Dispatch<D = Action> {
  // tslint:disable-next-line:callable-types
  <A extends D>(action: A): A
}

export interface MiddlewareAPI<S = any, D = Action> {
  dispatch: Dispatch<D>
  getState(): S
}

export interface Middleware {
  // tslint:disable-next-line:callable-types
  (store: MiddlewareAPI<any, FluxAction>): (next: Dispatch<FluxAction>) => Dispatch<FluxAction>
}
