import { useCallback, useRef, useState } from "react";

export function useAsyncCounter() {
  const countRef = useRef(0);
  const [isActive, setIsActive] = useState(false);

  const increment = useCallback(() => {
    countRef.current += 1;
    if (countRef.current === 1) {
      setIsActive(true);
    }
  }, []);

  const decrement = useCallback(() => {
    countRef.current -= 1;
    if (countRef.current === 0) {
      setIsActive(false);
    }
  }, []);

  return { increment, decrement, isActive };
}
