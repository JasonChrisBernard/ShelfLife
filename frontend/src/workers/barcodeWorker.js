import {
  readBarcodes,
  prepareZXingModule,
} from "zxing-wasm/reader";

import wasmUrl from
  "zxing-wasm/reader/zxing_reader.wasm?url";


// Initialize the barcode engine

prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) =>
      path.endsWith(".wasm")
        ? wasmUrl
        : prefix + path,
  },
  fireImmediately: true,
});


// Receive captured images

self.onmessage = async (event) => {

  const { type, images } = event.data;

  if (type === "preload") return;

  try {

    const startTime = performance.now();

    for (const image of images) {

      if (!image) continue;

      const response = await fetch(image);
      const blob = await response.blob();

      const results = await readBarcodes(
        blob,
        {
          formats: [
            "EAN13",
            "EAN8",
            "UPCA",
          ],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true,
        }
      );

      const codes = [...new Set(
        results.map(result => result.text)
      )];

      if (codes.length === 1) {

        self.postMessage({
          found: true,
          barcode: codes[0],
          source: "zxing-wasm",
          needsConfirmation: true,
          duration: Math.round(
            performance.now() - startTime
          ),
        });

        return;
      }

      if (codes.length > 1) break;
    }

    self.postMessage({
      found: false,
      barcode: "",
      source: "zxing-wasm",
      duration: Math.round(
        performance.now() - startTime
      ),
    });

  } catch (error) {

    self.postMessage({
      found: false,
      barcode: "",
      source: "zxing-wasm",
      error: error.message,
    });
  }
};