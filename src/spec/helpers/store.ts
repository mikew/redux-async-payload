import {
  Action,
  AnyAction,
  applyMiddleware,
  createStore,
  Middleware,
  Reducer,
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

export const createWithMiddleware = (
  reducer: Reducer<any, AnyAction>,
): Store<any, AnyAction> => {
  return createStore(
    reducer,
    applyMiddleware(middleware({ throwOriginalError: false }), logger),
  )
}

export function clearActionHistory() {
  while (actionHistory.length) {
    actionHistory.pop()
  }
}

export function getActionHistory() {
  return actionHistory
}
