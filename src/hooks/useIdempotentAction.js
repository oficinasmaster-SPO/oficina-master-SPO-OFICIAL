/**
 * useIdempotentAction
 *
 * Hook TDD-first para garantir que uma ação assíncrona só seja
 * executada UMA VEZ por vez, independente de duplos cliques.
 *
 * Regras:
 *  - Enquanto `running` é true, chamadas subsequentes são silenciosamente ignoradas.
 *  - Depois que a Promise resolve/rejeita, `running` volta a false.
 *  - `execute` retorna a Promise original ou undefined (se ignorada).
 *
 * TDD: tests/idempotent/useIdempotentAction.test.js
 *
 * Uso:
 *   const { execute, running } = useIdempotentAction();
 *   <Button disabled={running} onClick={() => execute(handleSave)} />
 */
import { useRef, useState, useCallback } from "react";

export function useIdempotentAction() {
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);

  const execute = useCallback(async (fn, ...args) => {
    if (runningRef.current) return undefined; // silently ignore duplicate
    runningRef.current = true;
    setRunning(true);
    try {
      return await fn(...args);
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
  }, []);

  return { execute, running, reset };
}