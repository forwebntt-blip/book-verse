import { csrfSync } from "csrf-sync";

const {
  csrfSynchronisedProtection,
  generateToken,
  invalidCsrfTokenError,
} = csrfSync({
  getTokenFromRequest: (req) => {
    if (req.is("application/x-www-form-urlencoded")) {
      return req.body?._csrf;
    }

    return req.headers["x-csrf-token"];
  },
});

export type CsrfToken = string;

export {
  csrfSynchronisedProtection,
  generateToken,
  invalidCsrfTokenError,
};
