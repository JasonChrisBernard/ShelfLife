import { isValidGTIN } from "./barcodeWasmService";

let worker = null;
let scanning = false;


// =====================================
// SCANNER CONFIGURATION
// =====================================

const SCAN_TIMEOUT = 500;


// =====================================
// 1. CREATE ZBAR WORKER
// =====================================

const getWorker = () => {

  if (!worker) {

    worker = new Worker(
      new URL(
        "../workers/zbarWorker.js",
        import.meta.url
      ),
      { type: "module" }
    );
  }

  return worker;
};


// =====================================
// 2. PRELOAD ZBAR-WASM
// =====================================

export const preloadZbarWasm = () => {

  getWorker().postMessage({
    type: "preload",
  });
};


// =====================================
// 3. SCAN BARCODE
// =====================================

export const scanBarcodeWithZbar = (
  originalImage,
  croppedImage = null
) => {

  // PREVENT DUPLICATE SCANS

  if (scanning) {

    return Promise.resolve({
      found: false,
      barcode: "",
      source: "zbar-wasm",
      error: "Scanner is busy",
    });
  }


  return new Promise((resolve) => {

    const startTime = performance.now();

    const scanner = getWorker();

    scanning = true;

    let timer;
    let completed = false;


    // =================================
    // COMPLETE SCANNING
    // =================================

    const finish = (result) => {

      if (completed) return;

      completed = true;

      clearTimeout(timer);

      scanning = false;

      scanner.onmessage = null;
      scanner.onerror = null;

      const totalDuration = Math.round(
        performance.now() - startTime
      );

      console.log(
        "ZBar-WASM completed:",
        totalDuration,
        "ms"
      );

      resolve({
        ...result,
        totalDuration,
      });
    };


    // =================================
    // RECEIVE WORKER RESPONSE
    // =================================

    scanner.onmessage = (event) => {

      const result = event.data;

      const valid =
        result?.found &&
        isValidGTIN(result.barcode);

      finish({

        ...result,

        found: Boolean(valid),

        barcode:
          valid ? result.barcode : "",

        needsConfirmation: Boolean(valid),
      });
    };


    // =================================
    // HANDLE WORKER ERRORS
    // =================================

    scanner.onerror = (error) => {

      console.error(
        "ZBar-WASM worker error:",
        error.message
      );

      scanner.terminate();

      worker = null;

      finish({
        found: false,
        barcode: "",
        source: "zbar-wasm",
        error: error.message || "Worker failed",
        needsConfirmation: false,
      });
    };


    // =================================
    // MAXIMUM TIMEOUT — 500 MS
    // =================================

    timer = setTimeout(() => {

      scanner.terminate();

      worker = null;

      console.warn(
        `ZBar-WASM exceeded ${SCAN_TIMEOUT} ms`
      );

      finish({
        found: false,
        barcode: "",
        source: "zbar-wasm",
        timedOut: true,
        needsConfirmation: false,
      });

    }, SCAN_TIMEOUT);


    // =================================
    // SEND CAPTURED PHOTOGRAPHS
    // =================================

    try {

      scanner.postMessage({

        type: "scan",

        images: [
          croppedImage,
          originalImage,
        ].filter(Boolean),
      });

    } catch (error) {

      scanner.terminate();

      worker = null;

      finish({
        found: false,
        barcode: "",
        source: "zbar-wasm",
        error: error.message,
        needsConfirmation: false,
      });
    }
  });
};