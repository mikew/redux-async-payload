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
  },
})
```

This will dispatch 3 actions, in this order:

```json
[
  {
    "type": "fetchResults/start"
  },
  {
    "type": "recordResults",
    "payload": ["results of your api call"]
  },
  {
    "type": "fetchResults/success"
  }
]
```

## Installation

```bash
npm install --save-dev redux-async-payload
```

```typescript
import { applyMiddleware, createStore } from 'redux'
import reduxAsyncPayload from 'redux-async-payload'

const configureStore = applyMiddleware(reduxAsyncPayload({}))(createStore)

// Options are
interface MiddlewareOptions {
  delimiter?: string
  suffixes?: {
    start?: string
    success?: string
    error?: string
  }
}
```

## Features

### Handle payload as Promise instead of async function.

The payload can be a Promise. This will also dispatch the `/start` and
`/success` actions:

```typescript
dispatch({
  type: 'fetchResults',
  payload: someApiCall(),
})
```

### Passing data to `/success` action

No matter what you initially pass as a payload, the `/success` action will receive the result of it should you want to do anything with it in a reducer or at the point of dispatching:

```typescript
dispatch({ payload: Promise.resolve(42), type: 'fetchResults' })
// { payload: 42, type: 'fetchResults/success }

dispatch({
  async payload() {
    return 42
  },
  type: 'fetchResults',
})
// { payload: 42, type: 'fetchResults/success }

dispatch({
  payload() {
    return 42
  },
  type: 'fetchResults',
})
// { payload: 42, type: 'fetchResults/success }
```

### Skip `/start` and `/success` actions

These actions are dispatched by the middleware when the payload is either a
Function or a Promise. You can skip them by adding metadata to your action.
This acts more like redux-thunk without having to install both middleware:

```typescript
store.dispatch({
  type: 'foo',
  payload(dispatch) {
    dispatch(/* */)
  },
  meta: {
    asyncPayload: {
      skipOuter: true,
    },
  },
})
```

### Awaiting dispatch

`dispatch()` now returns `Promise<any>`. That means that you can `await` it
when dispatching your actions throughout your code, enabling more ways of
combining async actions.

### Types for reducers

`redux-async-payload` comes with `ActionStartType`, `ActionSuccessType`, and `ActionErrorType`.

```typescript
function reducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case `${actions.constants.myAction}/start`: {
      action = action as ActionStartType<typeof actions.myAction>

      return {
        ...state,
      }
    }

    case `${actions.constants.myAction}/success`: {
      action = action as ActionSuccessType<typeof actions.myAction>
      return {
        ...state,
      }
    }

    case `${actions.constants.myAction}/error`:
      {
        action = action as ActionErrorType<typeof actions.myAction>
        return {
          ...state,
        }
      }

      return state
  }
}
```
