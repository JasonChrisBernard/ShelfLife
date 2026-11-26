import {
  analyzeExpiryImage,
  analyzeProductImage,
  testGeminiConnection,
  analyzeBarcodeWithGemini,
} from "../services/geminiService.js";


import {
  lookupProductByBarcode,
} from "../services/productLookupService.js";

import {
  isValidGTIN,
} from "../services/asposeService.js";


// ==========================================
// TEST GEMINI
// ==========================================

export const testGemini = async (
  req,
  res
) => {
  try {
    const result =
      await testGeminiConnection();

    res.status(200).json({
      success: true,
      message: result,
    });
  } catch (error) {
    console.error(
      "Gemini test error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Gemini connection failed",
      error: error.message,
    });
  }
};


// ==========================================
// PRODUCT IMAGE
// ==========================================

export const analyzeProduct = async (
  req,
  res
) => {
  try {
    const {
      image,
      ocrText = "",
    } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message:
          "Product image is required",
      });
    }

    if (typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid image format",
      });
    }

    // Example:
    // data:image/jpeg;base64,/9j/4AAQ...

    const match = image.match(
      /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message:
          "Image must be JPEG, PNG or WebP",
      });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    // Calculate approximate image size
    const imageSize =
      Buffer.byteLength(
        base64Data,
        "base64"
      );

    // Development safety limit: 5 MB
    if (imageSize > 5 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message:
          "Image is too large. Maximum size is 5 MB.",
      });
    }

    const product =
      await analyzeProductImage({
        base64Data,
        mimeType,
        ocrText,
      });

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
  console.error(
    "Product recognition error:",
    error
  );

  if (error?.status === 503) {
    return res
      .status(503)
      .json({
        success: false,

        code:
          "VISION_TEMPORARILY_BUSY",

        message:
          "AI scanning is temporarily busy. Please try again.",
      });
  }

  if (error?.status === 429) {
    return res
      .status(429)
      .json({
        success: false,

        code:
          "VISION_RATE_LIMIT",

        message:
          "AI scan limit reached. Please try again later.",
      });
  }

  return res
    .status(500)
    .json({
      success: false,

      message:
        "Product recognition failed.",
    });
}
};

export const analyzeExpiry =
  async (req, res) => {

    try {
      const { image } =
        req.body;

      if (!image) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Expiry image is required",
          });
      }

      const match =
        image.match(
          /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/
        );

      if (!match) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid expiry image",
          });
      }

      const mimeType =
        match[1];

      const base64Data =
        match[2];

      const expiry =
        await analyzeExpiryImage({
          base64Data,
          mimeType,
        });

      return res
        .status(200)
        .json({
          success: true,
          expiry,
        });

    } catch (error) {
      console.error(
        "Expiry Gemini fallback error:",
        error
      );

      if (
        error?.status === 503
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "AI expiry fallback is temporarily busy.",
          });
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Could not analyze expiry date.",
        });
    }
  };

 // =====================================
// HYBRID BARCODE RECOGNITION
// =====================================

// =====================================
// GEMINI BARCODE RECOGNITION
// =====================================

export const analyzeBarcode = async (
  req,
  res
) => {

  const startTime = performance.now();

  try {

    const { image } = req.body || {};


    // =================================
    // 1. VALIDATE IMAGE
    // =================================

    if (
      typeof image !== "string" ||
      !image
    ) {

      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }


    const match = image.match(
      /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/
    );


    if (!match) {

      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }


    const mimeType = match[1];

    const base64Data = match[2];


    // =================================
    // 2. VALIDATE IMAGE SIZE
    // =================================

    if (
      Buffer.byteLength(
        base64Data,
        "base64"
      ) > 5 * 1024 * 1024
    ) {

      return res.status(413).json({
        success: false,
        message: "Image is too large",
      });
    }


    // =================================
    // 3. DIRECT GEMINI FALLBACK
    // =================================

    console.log(
      "Both local barcode readers failed."
    );

    console.log(
      "Starting direct Gemini fallback..."
    );


    const result =
      await analyzeBarcodeWithGemini({

        base64Data,

        mimeType,
      });


    // =================================
    // 4. CHECKSUM VALIDATION
    // =================================

    const valid =

      result?.found === true &&

      isValidGTIN(result.barcode);


    const duration = Math.round(

      performance.now() - startTime
    );


    if (!valid) {

      console.log(
        "Gemini could not detect a valid barcode"
      );

      return res.status(200).json({

        success: true,

        barcode: {

          found: false,

          barcode: "",

          source: "gemini",

          needsConfirmation: false,

          duration,
        },
      });
    }


    // =================================
    // 5. SUCCESSFUL RECOGNITION
    // =================================

    console.log(
      "Gemini barcode detected:",
      result.barcode
    );

    console.log(
      "Gemini fallback duration:",
      duration,
      "ms"
    );


    return res.status(200).json({

      success: true,

      barcode: {

        found: true,

        barcode: result.barcode,

        source: "gemini",

        method: "gemini-vision",

        needsConfirmation: true,

        duration,
      },
    });


  } catch (error) {

    console.error(
      "Gemini barcode error:",
      error.message
    );


    return res.status(502).json({

      success: false,

      message:
        "Barcode recognition unavailable. Please retake the photo.",
    });
  }
};

// =====================================
// PRODUCT LOOKUP BY BARCODE
// =====================================

export const lookupBarcode = async (req, res) => {

  try {

    const barcode = req.params.barcode;

    if (!isValidGTIN(barcode)) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid barcode number or checksum",
      });
    }

    const result =
      await lookupProductByBarcode(barcode);

    return res.status(200).json({

      success: true,

      ...result,
    });

  } catch (error) {

    console.error(
      "Product lookup error:",
      error.message
    );

    return res.status(502).json({

      success: false,

      message:
        "Product lookup service unavailable. Please try again.",
    });
  }
};