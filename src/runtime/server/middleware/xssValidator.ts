import { defineEventHandler, createError, getQuery, readBody } from "h3";
import { FilterXSS } from "xss";
import { getRouteRules } from "#imports";

export default defineEventHandler(async (event) => {
  const routeRules = getRouteRules(event);
  const xssValidator = new FilterXSS(routeRules.security.xssValidator);

  if (routeRules.security.xssValidator !== false) {
    if (["POST", "GET"].includes(event.node.req.method!!)) {
      const valueToFilter =
        event.node.req.method === "GET" ? getQuery(event) : await readBody(event);
        // Fix for problems when one middleware is returning an error and it is catched in the next
      if (valueToFilter && Object.keys(valueToFilter).length) {
        if (valueToFilter.statusMessage && valueToFilter.statusMessage !== 'Bad Request') return
        const stringifiedValue = JSON.stringify(valueToFilter);
        const processedValue = xssValidator.process(JSON.stringify(valueToFilter));
        if (processedValue !== stringifiedValue) {
          const badRequestError = { statusCode: 400, statusMessage: "Bad Request" };
          if (routeRules.security.requestSizeLimiter.throwError === false) {
            return badRequestError;
          }

          throw createError(badRequestError);
        }
      }
    }
  }
});
