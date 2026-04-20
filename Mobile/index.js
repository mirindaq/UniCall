const globalAny = globalThis;

if (typeof globalAny.DOMException === "undefined") {
  class DomExceptionPolyfill extends Error {
    constructor(message = "", name = "DOMException") {
      super(message);
      this.name = name;
      this.code = 0;
    }
  }

  globalAny.DOMException = DomExceptionPolyfill;
  if (typeof global !== "undefined") {
    global.DOMException = DomExceptionPolyfill;
  }
  if (typeof window !== "undefined") {
    window.DOMException = DomExceptionPolyfill;
  }
  if (typeof self !== "undefined") {
    self.DOMException = DomExceptionPolyfill;
  }
}

require("expo-router/entry");
