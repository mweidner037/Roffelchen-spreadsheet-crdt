import { Collab, CRuntime } from "@collabs/collabs";
import { useEffect, useState } from "react";

/**
 *
 * @param {Collab} collab
 */
export function useCollab(collab) {
  const [, setCount] = useState(0);
  useEffect(() => {
    // Whenever there is a collab Any event, rerender on the next
    // CRuntime Change event.
    /** @type {CRuntime} */
    const runtime = collab.runtime;
    let pending = false;
    return collab.on("Any", () => {
      if (!pending) {
        pending = true;
        runtime.on(
          "Change",
          () => {
            // Rerender in a new task.
            setTimeout(() => {
              pending = false;
              setCount((count) => count + 1);
            }, 0);
          },
          { once: true }
        );
      }
    });
  }, [collab]);
}
