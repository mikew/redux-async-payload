// Some of these imports are just needed so there's no error with
// `createWithMiddleware`.
// See https://github.com/Microsoft/TypeScript/issues/5711
import {
  Action,
  // @ts-ignore
  AnyAction,
  applyMiddleware,
  createStore,
  // @ts-ignore
  GenericStoreEnhancer,
  Middleware,
  // @ts-ignore
  Reducer,
  // @ts-ignore
  Store,
} from 'redux'

// tslint:disable-next-line:import-name
import middleware from '../../index'

const actionHistory: Action[] = []

const logger: Middleware = () => (dispatch) => (action) => {
  if (!action) {
    return dispatch({ type: 'undefined' } as any)
  }

  actionHistory.push(action)

  return dispatch(action)
}

export const createWithMiddleware = applyMiddleware(
  middleware(),
  logger,
)(createStore)

export function clearActionHistory() {
  while (actionHistory.length) {
    actionHistory.pop()
  }
}

export function getActionHistory() {
  return actionHistory
}
