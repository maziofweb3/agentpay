"use client";

import { useEffect, useState } from "react";
import { canSwitchNetwork } from "@/lib/environment";

/**
 * Hydration-safe read of `canSwitchNetwork()`.
 *
 * The underlying check touches `window.location`, so calling it during render would return
 * false on the server and true on the client — a hydration mismatch. Starting at false and
 * resolving in an effect keeps the first client render identical to the server output.
 */
export function useCanSwitchNetwork(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const result = canSwitchNetwork();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(result);
  }, []);

  return allowed;
}
