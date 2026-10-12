// Jest test setup file
// Automatically loaded by CRA / CRACO before running test suites

// 1. Real global.fetch mock preventing external network leaks during unit tests
const defaultFetchMock = jest.fn((url, options) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve([]),
    text: () => Promise.resolve(""),
    blob: () => Promise.resolve(new Blob()),
    headers: {
      get: (header) => (header?.toLowerCase() === "content-type" ? "application/json" : null),
    },
  });
});

global.fetch = defaultFetchMock;
globalThis.fetch = defaultFetchMock;
if (typeof window !== "undefined") {
  window.fetch = defaultFetchMock;
}

beforeEach(() => {
  defaultFetchMock.mockImplementation((url, options) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(""),
      blob: () => Promise.resolve(new Blob()),
      headers: {
        get: (header) => (header?.toLowerCase() === "content-type" ? "application/json" : null),
      },
    });
  });
});

// 2. Suppress unhandled jsdom VirtualConsole AggregateError network spam during unit tests
const origConsoleError = console.error;
console.error = (...args) => {
  const isNetworkOrDomNoise = args.some(
    (a) =>
      (a instanceof Error && (a.name === "AggregateError" || a.message?.includes("AggregateError") || a.code === "ERR_NETWORK" || a.isAxiosError)) ||
      (typeof a === "string" && (a.includes("AggregateError") || a.includes("ERR_NETWORK") || a.includes("Exams load error") || a.includes("cannot be a child of") || a.includes("hydration error") || a.includes("validateDOMNesting")))
  );
  if (isNetworkOrDomNoise) {
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
