// src/lib/zodMessages.ts
//
// App-wide Zod message defaults. A required field the user never touched
// arrives as `undefined`; Zod's raw "Invalid input: expected string,
// received undefined" means nothing to a user, so say "required" instead.
// Field-specific messages in each schema still take precedence.

import { z } from "zod";

z.config({
  customError: (issue) => {
    if (issue.code === "invalid_type" && (issue.input === undefined || issue.input === null || issue.input === "")) {
      return "This field is required";
    }
    if (issue.code === "invalid_type" && issue.expected === "number") {
      return "Enter a valid number";
    }
    return undefined;
  },
});
