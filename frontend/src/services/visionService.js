const API_URL = "/api/vision";


// ==========================================
// PRODUCT SCANNER
// PaddleOCR text + image → Gemini
// ==========================================

export const analyzeProductImage =
  async (
    image,
    ocrText = ""
  ) => {

    const response =
      await fetch(
        `${API_URL}/product`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "include",

          body:
            JSON.stringify({
              image,
              ocrText,
            }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Product recognition failed"
      );
    }

    return data;
  };


// ==========================================
// EXPIRY SCANNER
// Used only when local OCR fails
// ==========================================

export const analyzeExpiryImage =
  async (image) => {

    const response =
      await fetch(
        `${API_URL}/expiry`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "include",

          body:
            JSON.stringify({
              image,
            }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Expiry recognition failed"
      );
    }

    return data;
  };

// =====================================
// BARCODE SCANNER API
// =====================================

export const analyzeBarcodeImage =
  async (image) => {

    const response = await fetch(
      `${API_URL}/barcode`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          image,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Barcode recognition failed"
      );
    }

    return data;
  };

// =====================================
// PRODUCT LOOKUP API
// =====================================

export const lookupBarcodeProduct =
  async (barcode, signal) => {

    const url =
      `${API_URL}/barcode/${encodeURIComponent(barcode)}`;

    console.log("Product lookup URL:", url);

    const response = await fetch(url, {

      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },

      signal,
    });

    console.log(
      "Lookup HTTP status:",
      response.status
    );

    console.log(
      "Response content type:",
      response.headers.get("content-type")
    );

    const raw = await response.text();

    console.log(
      "Raw lookup response:",
      raw.slice(0, 500)
    );

    let data;

    try {

      data = JSON.parse(raw);

    } catch {

      throw new Error(
        `Invalid API response (HTTP ${response.status})`
      );
    }

    if (!response.ok) {

      throw new Error(
        data.message || "Product lookup failed"
      );
    }

    return data;
  };