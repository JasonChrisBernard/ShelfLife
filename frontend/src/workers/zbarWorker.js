import {
  scanImageData,
  setModuleArgs,
  getInstance,
} from "@undecaf/zbar-wasm";


// =====================================
// INITIALIZE ZBAR
// =====================================

setModuleArgs({
  locateFile: () =>
    new URL(
      "/wasm/zbar.wasm",
      self.location.origin
    ).href,
});


// =====================================
// RECEIVE SCANNING REQUEST
// =====================================

self.onmessage = async (event) => {

  const { type, images } = event.data;

  try {

    await getInstance();

    if (type === "preload") {
      console.log("ZBar-WASM ready");
      return;
    }

    if (type !== "scan") return;

    const startTime = performance.now();

    for (const image of images) {

      if (!image) continue;

      const response = await fetch(image);
      const blob = await response.blob();

      const bitmap =
        await createImageBitmap(blob);

      const canvas = new OffscreenCanvas(
        bitmap.width,
        bitmap.height
      );

      const context = canvas.getContext("2d");

      context.drawImage(bitmap, 0, 0);

      bitmap.close();

      const imageData =
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

      const symbols =
        await scanImageData(imageData);

      const barcodes = [...new Set(
        symbols
          .filter(symbol =>
            [8, 12, 13].includes(symbol.decode().trim().length)
           )
          .map(symbol =>
            symbol.decode().trim()
          )
      )];

      if (barcodes.length === 1) {

        self.postMessage({
          found: true,
          barcode: barcodes[0],
          source: "zbar-wasm",
          needsConfirmation: true,
          duration: Math.round(
            performance.now() - startTime
          ),
        });

        return;
      }

      if (barcodes.length > 1) break;
    }

    self.postMessage({
      found: false,
      barcode: "",
      source: "zbar-wasm",
      duration: Math.round(
        performance.now() - startTime
      ),
    });

  } catch (error) {

    console.warn("ZBar-WASM error:", error.message);

    if (type === "scan") {
      self.postMessage({
        found: false,
        barcode: "",
        source: "zbar-wasm",
        error: error.message,
      });
    }
  }
};