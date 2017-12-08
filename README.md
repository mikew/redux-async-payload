# redux-async-payload

Allows you use async functions for payloads in redux. Also supports Promises
and synchronous code.

## Example

```javascript
store.dispatch({
  type: 'fetchResults',
  async payload(dispatch) {
    const results = await someApiCall()

    dispatch({
      type: 'recordResults',
      payload: results,
    })
  }
})
```

This will dispatch 3 actions, in this order:

```json
[
  {
    "type": "fetchResults/start",
  },
  {
    "type": "recordResults",
    "payload": ["results of your api call"]
  },
  {
    "type": "fetchResults/finish",
  },
]
```

## Installation

```bash
npm install --save-dev redux-async-payload
```

```typescript
import {
  applyMiddleware,
  createStore,
} from 'redux'
import reduxAsyncPayload from 'redux-async-payload'

const configureStore = applyMiddleware(reduxAsyncPayload({}))(createStore)

// Options are
interface MiddlewareOptions {
  delimiter?: string,
  suffixes?: {
    start?: string,
    success?: string,
    error?: string,
  },
}
```