let worker = null;
let scanning = false;


// =====================================
// SCANNER CONFIGURATION
// =====================================

const SCAN_TIMEOUT = 500;


// =====================================
// 1. CREATE WEB WORKER
// =====================================

const getWorker = () => {

  if (!worker) {

    worker = new Worker(
      new URL(
        "../workers/barcodeWorker.js",
        import.meta.url
      ),
      { type: "module" }
    );
  }

  return worker;
};


// =====================================
// 2. PRELOAD ZXING-WASM
// =====================================

export const preloadBarcodeWasm = () => {

  getWorker().postMessage({
    type: "preload",
  });
};


// =====================================
// 3. BARCODE CHECKSUM VALIDATION
// =====================================

export const isValidGTIN = (barcode) => {

  if (
    typeof barcode !== "string" ||
    !/^\d+$/.test(barcode) ||
    ![8, 12, 13, 14].includes(barcode.length)
  ) {
    return false;
  }

  let sum = 0;
  let multiplier = 3;

  for (
    let i = barcode.length - 2;
    i >= 0;
    i--
  ) {

    sum += Number(barcode[i]) * multiplier;

    multiplier =
      multiplier === 3 ? 1 : 3;
  }

  return (
    (10 - (sum % 10)) % 10 ===
    Number(barcode[barcode.length - 1])
  );
};


// =====================================
// 4. SCAN BARCODE
// =====================================

export const scanBarcodeWithWasm = (
  originalImage,
  croppedImage = null
) => {

  // PREVENT DUPLICATE SCANS

  if (scanning) {

    return Promise.resolve({
      found: false,
      barcode: "",
      source: "zxing-wasm",
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
        "ZXing-WASM completed:",
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
        "ZXing-WASM worker error:",
        error.message
      );

      scanner.terminate();

      worker = null;

      finish({
        found: false,
        barcode: "",
        source: "zxing-wasm",
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
        `ZXing-WASM exceeded ${SCAN_TIMEOUT} ms`
      );

      finish({
        found: false,
        barcode: "",
        source: "zxing-wasm",
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
        source: "zxing-wasm",
        error: error.message,
        needsConfirmation: false,
      });
    }
  });
};