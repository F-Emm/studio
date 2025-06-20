
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000 // Effectively infinite for UI, removal is for memory

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
      toast: Partial<ToasterToast> & { id: string }
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
      let toastActuallyChanged = false;
      const newToasts = state.toasts.map((t) => {
        if (t.id === action.toast.id) {
          const currentToast = t;
          const updates = action.toast;
          let propertiesDiffer = false;
          for (const key in updates) {
            if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id') {
              // @ts-ignore
              if (currentToast[key] !== updates[key]) {
                propertiesDiffer = true;
                break;
              }
            }
          }
          if (propertiesDiffer) {
            toastActuallyChanged = true;
            return { ...currentToast, ...updates };
          }
        }
        return t;
      });
      return toastActuallyChanged ? { ...state, toasts: newToasts } : state;
    }

    case "DISMISS_TOAST": {
      const { toastId } = action;
      let changed = false;

      const newToasts = state.toasts.map((t: ToasterToast) => {
        if (toastId === undefined || t.id === toastId) {
          if (t.open !== false) { 
            changed = true;
            addToRemoveQueue(t.id); 
            return { ...t, open: false }; 
          }
        }
        return t;
      });
      
      return changed ? { ...state, toasts: newToasts } : state;
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

type Toast = Omit<ToasterToast, "id" | "open" | "onOpenChange" | "duration">

function toast({ ...props }: Toast) {
  const id = genId();
  
  const onOpenChangeHandler = (openFromRadix: boolean) => {
    if (!openFromRadix) {
      setTimeout(() => { // Make the dispatch asynchronous
        dispatch({ type: "DISMISS_TOAST", toastId: id });
      }, 0);
    }
  };

  const dismissThisToast = () => {
    dispatch({
      type: "DISMISS_TOAST",
      toastId: id,
    });
  };

  const updateThisToast = (updateProps: Partial<Omit<ToasterToast, 'id' | 'open' | 'onOpenChange' | 'duration'>>) =>
    dispatch({
      type: "UPDATE_TOAST",
      // @ts-ignore
      toast: { ...updateProps, id },
    });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration: Infinity, 
      onOpenChange: onOpenChangeHandler,
    },
  });

  return {
    id: id,
    dismiss: dismissThisToast,
    update: updateThisToast,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []); 

  const stableDismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, []);

  return {
    ...state,
    toast,
    dismiss: stableDismiss,
  };
}

export { useToast, toast };
