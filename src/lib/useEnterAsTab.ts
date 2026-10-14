// src/lib/useEnterAsTab.ts
import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

const FIELDS = "input:not([disabled]):not([type=hidden]), textarea:not([disabled])";

/** Enter moves to the next field (Shift+Enter to the previous one) inside the element it is attached to.
 *  onLast runs when Enter is pressed on the last field, e.g. to move into a grid. */
export function useEnterAsTab(onLast?: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      // defaultPrevented: an open dropdown already used this Enter to pick an option
      if (e.key !== "Enter" || e.defaultPrevented || !ref.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT") return; // textareas keep Enter for new lines, buttons for clicking

      const fields = Array.from(ref.current.querySelectorAll<HTMLElement>(FIELDS)).filter(
        (el) => el.offsetParent !== null, // skip fields in hidden tabs or panels
      );
      const i = fields.indexOf(target);
      if (i < 0) return;

      e.preventDefault(); // no accidental form submit
      const dir = e.shiftKey ? -1 : 1;
      const next = fields[i + dir];
      if (next) next.focus();
      else if (dir === 1) onLast?.();
    },
    [onLast],
  );

  return { ref, onKeyDown };
}