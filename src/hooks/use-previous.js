import { useEffect, useRef } from "react";

/**
 * Returns the previous value of the given value.
 * On first render returns undefined.
 *
 * @param {*} value
 * @returns {*} the previous value (undefined on first render)
 */
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export default usePrevious;