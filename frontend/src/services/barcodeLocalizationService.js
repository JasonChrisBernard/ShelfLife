import Quagga from "@ericblade/quagga2";

import { isValidGTIN } from "./barcodeWasmService";


// =====================================
// CONFIGURATION
// =====================================

const MAX_FRAME_SIZE = 960;

let processing = false;

let captureCanvas = null;


// =====================================
// VALIDATE BOUNDING BOX
// =====================================

const isValidBox = (box) => {

  return (
    Array.isArray(box) &&
    box.length === 4 &&
    box.every((point) => {

      return (
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
      );
    })
  );
};


// =====================================
// CAPTURE CURRENT VIDEO FRAME
// =====================================

const captureVideoFrame = (video) => {

  if (
    !video ||
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    return null;
  }

  if (!captureCanvas) {

    captureCanvas =
      document.createElement("canvas");
  }

  const scale = Math.min(
    1,
    MAX_FRAME_SIZE / video.videoWidth,
    MAX_FRAME_SIZE / video.videoHeight
  );

  const width = Math.round(
    video.videoWidth * scale
  );

  const height = Math.round(
    video.videoHeight * scale
  );

  captureCanvas.width = width;
  captureCanvas.height = height;

  const context =
    captureCanvas.getContext("2d");

  if (!context) return null;

  context.drawImage(
    video,
    0,
    0,
    width,
    height
  );

  return {

    image: captureCanvas.toDataURL(
      "image/jpeg",
      0.9
    ),

    width,

    height,
  };
};


// =====================================
// AUTOMATIC BARCODE LOCALIZATION
// =====================================

export const locateBarcodeInVideo =
  async (video) => {

    // PREVENT OVERLAPPING DETECTION

    if (processing) {

      return {
        found: false,
        busy: true,
        boxes: [],
      };
    }

    const capturedAt = performance.now();

    const frame = captureVideoFrame(video);

    if (!frame) {

      return {
        found: false,
        boxes: [],
      };
    }

    processing = true;

    const startTime = performance.now();

    try {

      const result = await new Promise(
        (resolve, reject) => {

          try {

            const request =
              Quagga.decodeSingle({

                src: frame.image,

                locate: true,

                numOfWorkers: 0,

                inputStream: {
                  size: 0,
                },

                locator: {

                  patchSize: "medium",

                  halfSample: true,
                },

                decoder: {

                  readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "upc_reader",
                  ],

                  multiple: false,
                },

              }, resolve);

            request?.catch?.(reject);

          } catch (error) {

            reject(error);
          }
        }
      );


      // =================================
      // CHECK DECODED BARCODE
      // =================================

      const barcode =
        result?.codeResult?.code || "";

      const verified =
        isValidGTIN(barcode) &&
        isValidBox(result?.box);


      // =================================
      // EXTRACT DETECTED REGION
      // =================================

      let boxes = [];

      if (isValidBox(result?.box)) {

        boxes = [result.box];

      } else if (
        Array.isArray(result?.boxes)
      ) {

        boxes = result.boxes
          .filter(isValidBox)
          .slice(0, 3);
      }


      // =================================
      // NORMALIZE COORDINATES
      // =================================

      const normalizedBoxes =
        boxes.map((box) =>

          box.map((point) => ({

            x: point[0] / frame.width,

            y: point[1] / frame.height,

          }))
        );


      // =================================
      // RETURN LOCALIZATION RESULT
      // =================================

      return {

        found: normalizedBoxes.length > 0,

        verified,

        barcode: verified ? barcode : "",

        boxes: normalizedBoxes,

        // PRESERVE THE EXACT VERIFIED PHOTO

        frameImage: verified ? frame.image : null,

        capturedAt,

        duration: Math.round(
            performance.now() - startTime
        ),
        };

    } catch (error) {

      console.warn(
        "Barcode localization error:",
        error.message
      );

      return {
        found: false,
        boxes: [],
        error: error.message,
      };

    } finally {

      processing = false;
    }
  };