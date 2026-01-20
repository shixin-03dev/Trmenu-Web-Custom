import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState({
    past: [] as T[],
    present: initialState,
    future: [] as T[]
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory(curr => {
        if (curr.past.length === 0) return curr;

        const previous = curr.past[curr.past.length - 1];
        const newPast = curr.past.slice(0, curr.past.length - 1);
        
        return {
            past: newPast,
            present: previous,
            future: [curr.present, ...curr.future]
        };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(curr => {
        if (curr.future.length === 0) return curr;

        const next = curr.future[0];
        const newFuture = curr.future.slice(1);

        return {
            past: [...curr.past, curr.present],
            present: next,
            future: newFuture
        };
    });
  }, []);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
      setHistory(curr => {
          const resolvedState = typeof newState === 'function' 
            ? (newState as (prev: T) => T)(curr.present)
            : newState;
          
          if (resolvedState === curr.present) return curr;

          // Limit history size to 50
          const newPast = [...curr.past, curr.present];
          if (newPast.length > 50) {
              newPast.shift();
          }

          return {
              past: newPast,
              present: resolvedState,
              future: [] // Clear future on new change
          };
      });
  }, []);

  // Allow direct manipulation of history if needed (e.g. reset)
  const resetHistory = useCallback((state: T) => {
      setHistory({
          past: [],
          present: state,
          future: []
      });
  }, []);

  return [history.present, setState, undo, redo, canUndo, canRedo, resetHistory] as const;
}
