
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST": {
      let changed = false;
      const newToasts = state.toasts.map((t) => {
        if (t.id === action.toast.id) {
          // A more granular check could be done here if all props of action.toast are compared
          changed = true; 
          return { ...t, ...action.toast };
        }
        return t;
      });
      return changed ? { ...state, toasts: newToasts } : state;
    }

    case "DISMISS_TOAST": {
      const { toastId } = action;
      let changed = false;

      if (toastId === undefined) { // Dismiss all toasts
        const newToasts = state.toasts.map(t => {
          if (t.open) {
            changed = true;
            addToRemoveQueue(t.id);
            return { ...t, open: false };
          }
          return t;
        });
        return changed ? { ...state, toasts: newToasts } : state;
      }

      // Dismiss a specific toast
      const newToastsSingleDismiss = state.toasts.map(t => {
        if (t.id === toastId && t.open) {
          changed = true;
          addToRemoveQueue(t.id);
          return { ...t, open: false };
        }
        return t;
      });
      return changed ? { ...state, toasts: newToastsSingleDismiss } : state;
    }
    case "REMOVE_TOAST": {
      if (action.toastId === undefined) {
        return state.toasts.length === 0 ? state : { ...state, toasts: [] };
      }
      const newToasts = state.toasts.filter((t) => t.id !== action.toastId);
      return newToasts.length === state.toasts.length ? state : { ...state, toasts: newToasts };
    }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  
  // This specific dismiss function is for the onOpenChange callback,
  // it needs to capture the correct 'id'.
  const dismissForThisToast = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismissForThisToast()
      },
    },
  })

  return {
    id: id,
    dismiss: dismissForThisToast, // The dismiss function specific to this toast id
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // Empty dependency array: subscribe on mount, unsubscribe on unmount

  return {
    ...state,
    toast, // `toast` utility function
    dismiss: React.useCallback((toastId?: string) => { // General dismiss function
      dispatch({ type: "DISMISS_TOAST", toastId })
    }, []),
  }
}

export { useToast, toast }
