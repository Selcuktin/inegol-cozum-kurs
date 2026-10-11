// Jest test setup file
// Automatically loaded by CRA / CRACO before running test suites

// Suppress unhandled jsdom VirtualConsole AggregateError network spam during unit tests
const origConsoleError = console.error;
console.error = (...args) => {
  const isNetworkError = args.some(
    (a) =>
      (a instanceof Error && (a.name === "AggregateError" || a.message?.includes("AggregateError") || a.code === "ERR_NETWORK" || a.isAxiosError)) ||
      (typeof a === "string" && (a.includes("AggregateError") || a.includes("ERR_NETWORK") || a.includes("Exams load error")))
  );
  if (isNetworkError) {
    return;
  }
  origConsoleError(...args);
};

const origConsoleWarn = console.warn;
console.warn = (...args) => {
  const isNetworkNoise = args.some(
    (a) =>
      typeof a === "string" &&
      (a.includes("Network request failed") ||
        (a.includes("[AccountingService] fetch") && a.includes("error")) ||
        a.includes("The width(-1) and height(-1) of chart should be greater than 0"))
  ) || args.some((a) => a instanceof Error && a.message?.includes("Network request failed"));
  if (isNetworkNoise) {
    return;
  }
  origConsoleWarn(...args);
};
