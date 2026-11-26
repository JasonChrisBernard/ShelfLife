import {
  BrowserMultiFormatReader,
} from "@zxing/browser";

import {
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

import {
  scanProductTextWithOcr,
} from "./expiryOcrService";


// =====================================
// 1. CONFIGURE ZXING
// =====================================

const hints = new Map();

hints.set(
  DecodeHintType.POSSIBLE_FORMATS,
  [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
  ]
);

hints.set(
  DecodeHintType.TRY_HARDER,
  true
);


// =====================================
// 2. LOAD IMAGE
// =====================================

const loadImage = (imageDataUrl) => {

  return new Promise((resolve, reject) => {

    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = reject;

    image.src = imageDataUrl;

  });

};


// =====================================
// 3. IMAGE PREPROCESSING
// =====================================

const enhanceBarcodeImage = async (
  imageDataUrl
) => {

  const image = await loadImage(
    imageDataUrl
  );

  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas unavailable");
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  context.drawImage(
    image,
    0,
    0
  );

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const pixels = imageData.data;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {

    // Convert RGB to grayscale

    const gray =
      pixels[i] * 0.299 +
      pixels[i + 1] * 0.587 +
      pixels[i + 2] * 0.114;


    // Increase contrast

    const contrast = 1.5;

    const enhanced = Math.max(
      0,
      Math.min(
        255,
        (gray - 128) * contrast + 128
      )
    );

    pixels[i] = enhanced;
    pixels[i + 1] = enhanced;
    pixels[i + 2] = enhanced;

  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas.toDataURL(
    "image/png"
  );

};


// =====================================
// 4. VALIDATE BARCODE CHECKSUM
// =====================================

export const isValidGTIN = (barcode) => {

  if (
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

    sum +=
      Number(barcode[i]) * multiplier;

    multiplier =
      multiplier === 3 ? 1 : 3;

  }

  const expectedCheckDigit =
    (10 - (sum % 10)) % 10;

  const actualCheckDigit =
    Number(barcode[barcode.length - 1]);

  return (
    expectedCheckDigit === actualCheckDigit
  );

};


// =====================================
// 5. EXTRACT BARCODE FROM OCR TEXT
// =====================================

const extractBarcodeFromText = (text) => {

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = new Set();

  const addCandidate = (value) => {

    // Allow digits separated by spaces

    if (!/^[\d\s]+$/.test(value)) {
      return;
    }

    const barcode = value.replace(/\s/g, "");

    // Focus OCR fallback on common
    // EAN-13 and UPC-A retail barcodes

    if (
      [12, 13].includes(barcode.length) &&
      isValidGTIN(barcode)
    ) {
      candidates.add(barcode);
    }

  };


  for (let i = 0; i < lines.length; i++) {

    addCandidate(lines[i]);

    // Handle digits split across OCR lines

    if (lines[i + 1]) {
      addCandidate(
        `${lines[i]} ${lines[i + 1]}`
      );
    }

    if (lines[i + 1] && lines[i + 2]) {
      addCandidate(
        `${lines[i]} ${lines[i + 1]} ${lines[i + 2]}`
      );
    }

  }

  // Reject ambiguous results

  if (candidates.size !== 1) {
    return null;
  }

  return [...candidates][0];

};


// =====================================
// 6. MAIN BARCODE SCANNER
// =====================================

export const scanBarcode = async (
  originalImage,
  croppedImage = null
) => {

  const reader =
  new BrowserMultiFormatReader(hints);

  const images = [
  {
    name: "Original image",
    image: originalImage,
  },
  {
    name: "Cropped image",
    image: croppedImage,
  },
].filter((item) => item.image);

  // ===================================
  // ATTEMPT 1 & 2 — NORMAL ZXING
  // ===================================

  for (const item of images) {

    try {

      console.log(
        `ZXing scanning: ${item.name}`
      );

      const result =
        await reader.decodeFromImageUrl(
          item.image
        );

      const barcode = result.getText();

      console.log(
        "Barcode detected:",
        barcode
      );

      return {
        found: true,
        barcode,
        source: "local-barcode",
        method: item.name,
        needsConfirmation: false,
      };

    } catch {

      console.warn(
        `${item.name} recognition failed`
      );

    }

  }


  // ===================================
  // ATTEMPT 3 — ENHANCED IMAGE
  // ===================================

  const imageToEnhance =
    croppedImage || originalImage;

  let enhancedImage = null;

  try {

    console.log(
      "Enhancing barcode image..."
    );

    enhancedImage =
      await enhanceBarcodeImage(
        imageToEnhance
      );

    const result =
      await reader.decodeFromImageUrl(
        enhancedImage
      );

    const barcode = result.getText();

    console.log(
      "Enhanced barcode detected:",
      barcode
    );

    return {
      found: true,
      barcode,
      source: "local-barcode",
      method: "enhanced-image",
      needsConfirmation: false,
    };

  } catch {

    console.warn(
      "Enhanced barcode recognition failed"
    );

  }


  // ===================================
  // ATTEMPT 4 — PADDLEOCR FALLBACK
  // ===================================

  try {

    console.log(
      "Running PaddleOCR barcode fallback..."
    );

    if (!croppedImage) {
  throw new Error(
    "Barcode frame image unavailable"
  );
}

console.log(
  "Extracting printed barcode digits..."
);

const digitImage =
  await extractBarcodeDigitRegion(
    croppedImage
  );

const ocrResult =
  await scanProductTextWithOcr(
    digitImage
  );

console.log(
  "Barcode digits detected:",
  ocrResult.text
);

    console.log(
      "OCR detected text:",
      ocrResult.text
    );

    const barcode =
      extractBarcodeFromText(
        ocrResult.text || ""
      );

    if (barcode) {

      console.log(
        "OCR barcode detected:",
        barcode
      );

      console.log(
        "Barcode checksum valid"
      );

      return {
        found: true,
        barcode,
        source: "local-ocr",
        method: "paddleocr",
        needsConfirmation: true,
      };

    }

  } catch (error) {

    console.warn(
      "Barcode OCR fallback failed:",
      error
    );

  }


  // ===================================
  // ALL ATTEMPTS FAILED
  // ===================================

  return {
    found: false,
    barcode: "",
    source: "local-barcode",
    method: null,
    needsConfirmation: false,
  };

};

// =====================================
// LIVE AUTOMATIC BARCODE SCANNER
// =====================================

export const startLiveBarcodeScan = (
  video,
  onDetected
) => {
  const liveHints = new Map();

  liveHints.set(
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ]
  );

  const reader =
    new BrowserMultiFormatReader(liveHints);

  const canvas =
    document.createElement("canvas");

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Canvas unavailable");
  }

  let stopped = false;
  let timer = null;
  let attempts = 0;

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };

  const scanFrame = () => {
    if (stopped) return;

    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      attempts++;

      if (attempts % 10 === 0) {
  console.log("Live scan attempts:", attempts);

  console.log(
    "Camera resolution:",
    video.videoWidth,
    video.videoHeight
  );
}

      // Every fourth attempt uses the full frame.
      const fullFrame = attempts % 4 === 0;

      const width = Math.round(
        video.videoWidth * (fullFrame ? 1 : 0.7)
      );

      const height = Math.round(
        video.videoHeight * (fullFrame ? 1 : 0.6)
      );

      const x = (video.videoWidth - width) / 2;
      const y = (video.videoHeight - height) / 2;

      if (
        canvas.width !== width ||
        canvas.height !== height
      ) {
        canvas.width = width;
        canvas.height = height;
      }

      context.drawImage(
        video,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      );

      let result = null;

      try {
        result = reader.decodeFromCanvas(canvas);
        } catch (error) {
        if (error.name !== "NotFoundException") {
            console.warn("Live scanner error:", error);
        }
     }

        const barcode = result?.getText().trim() || "";

        if (
        result &&
        [8, 12, 13].includes(barcode.length) &&
        isValidGTIN(barcode)
        ) {

        stop();

        console.log(
          "Live barcode detected:",
          barcode
        );

        onDetected({
          found: true,
          barcode,
          source: "local-barcode",
          method: "live-zxing",
          needsConfirmation: false,
        });

        return;
      }
    }

    timer = setTimeout(scanFrame, 250);
  };

  console.log("Live barcode scanner started");

  timer = setTimeout(scanFrame, 250);

  return stop;
};