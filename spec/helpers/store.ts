import {
  Action,
  applyMiddleware,
  createStore,
  Middleware,
} from 'redux'

// tslint:disable-next-line:import-name
import middleware from '../../src/index'

const actionHistory: Action[] = []

const logger: Middleware = () => (next) => (action) => {
  actionHistory.push(action)

  return next(action)
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
