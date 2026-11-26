import {
  PaddleOCR,
} from "@paddleocr/paddleocr-js";

let ocrPromise = null;


// ==========================================
// LOAD OCR ONLY ONCE
// ==========================================

const getOcr = async () => {
  if (!ocrPromise) {
    ocrPromise =
      PaddleOCR.create({
        textDetectionModelName:
          "PP-OCRv6_tiny_det",

        textRecognitionModelName:
          "PP-OCRv6_tiny_rec",

        worker: true,

        ortOptions: {
          backend: "wasm",

          wasmPaths:
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",

          numThreads: window.crossOriginIsolated ? 2 : 1,
          simd: true,
        },
      });
  }

  return ocrPromise;
};


// ==========================================
// DATA URL → BLOB
// ==========================================

const dataUrlToBlob =
  async (dataUrl) => {
    const response =
      await fetch(dataUrl);

    return response.blob();
  };


// ==========================================
// VALID DATE → YYYY-MM-DD
// ==========================================

const createIsoDate = (
  year,
  month,
  day
) => {
  year = Number(year);
  month = Number(month);
  day = Number(day);

  // Example: 26 → 2026
  if (year < 100) {
    year += 2000;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  // Prevent invalid dates such as
  // 32/15/2026
  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() + 1 !==
      month ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return [
    year,
    String(month).padStart(
      2,
      "0"
    ),
    String(day).padStart(
      2,
      "0"
    ),
  ].join("-");
};


// ==========================================
// FIND DATE INSIDE TEXT
// ==========================================

const findDateInText = (
  text
) => {
  if (!text) {
    return null;
  }

  // YYYY-MM-DD
  const ymd =
    text.match(
      /\b(\d{4})[./\-\s](\d{1,2})[./\-\s](\d{1,2})\b/
    );

  if (ymd) {
    return createIsoDate(
      ymd[1],
      ymd[2],
      ymd[3]
    );
  }

  // DD/MM/YYYY
  // DD-MM-YYYY
  // DD.MM.YYYY
  const dmy =
    text.match(
      /\b(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{2,4})\b/
    );

  if (dmy) {
    return createIsoDate(
      dmy[3],
      dmy[2],
      dmy[1]
    );
  }

  return null;
};

export const scanProductTextWithOcr =
  async (imageDataUrl) => {

    console.log(
      "Running local product OCR..."
    );

    const ocr =
      await getOcr();

    const blob =
      await dataUrlToBlob(
        imageDataUrl
      );

    const [result] =
      await ocr.predict(blob);

    const items =
      (result?.items || [])
        .map((item) => ({
          text:
            item.text
              ?.trim() || "",

          confidence:
            Math.round(
              (Number(
                item.score
              ) || 0) * 100
            ),
        }))
        .filter(
          (item) =>
            item.text
        );


    // Keep reasonably clear text
    const usefulItems =
      items.filter(
        (item) =>
          item.confidence >= 60
      );


    const text =
      usefulItems
        .map(
          (item) =>
            item.text
        )
        .join("\n");


    console.log(
      "Product OCR detected:",
      text
    );


    return {
      text,
      items:
        usefulItems,
    };
  };


// ==========================================
// EXPIRY WORDS
// ==========================================

const EXPIRY_KEYWORDS =
  /\b(EXP|EXPIRY|EXPIRES|USE\s*BY|BEST\s*BEFORE|BEST\s*BY|BBE|BB)\b/i;


// ==========================================
// SCAN EXPIRY
// ==========================================

export const scanExpiryWithOcr =
  async (imageDataUrl) => {

    console.log(
      "Running local expiry OCR..."
    );

    const ocr =
      await getOcr();

    const blob =
      await dataUrlToBlob(
        imageDataUrl
      );

    const [result] =
      await ocr.predict(blob);

    const items =
      (result?.items || [])
        .map((item) => ({
          text:
            item.text
              ?.trim() || "",

          score:
            Number(
              item.score
            ) || 0,
        }))
        .filter(
          (item) =>
            item.text
        );

    console.log(
      "OCR detected:",
      items
    );


    // ======================================
    // FIRST:
    // Prefer date near EXP / USE BY etc.
    // ======================================

    for (
      let i = 0;
      i < items.length;
      i++
    ) {
      const current =
        items[i];

      const next =
        items[i + 1];

      const context =
        `${current.text} ${
          next?.text || ""
        }`;

      if (
        EXPIRY_KEYWORDS.test(
          context
        )
      ) {
        const date =
          findDateInText(
            context
          );

        if (date) {
          const confidence =
            Math.round(
              Math.max(
                current.score,
                next?.score || 0
              ) * 100
            );

          return {
            found: true,

            expiryDate:
              date,

            originalText:
              context,

            confidence,

            needsConfirmation:
              confidence < 80,

            source:
              "local-ocr",

            allText:
              items
                .map(
                  (item) =>
                    item.text
                )
                .join("\n"),
          };
        }
      }
    }


    // ======================================
    // SECOND:
    // A very clear standalone date
    // ======================================

    for (
      const item of items
    ) {
      const date =
        findDateInText(
          item.text
        );

      if (
        date &&
        item.score >= 0.88
      ) {
        return {
          found: true,

          expiryDate:
            date,

          originalText:
            item.text,

          confidence:
            Math.round(
              item.score * 100
            ),

          // No EXP keyword detected,
          // so ask user to confirm.
          needsConfirmation:
            true,

          source:
            "local-ocr",

          allText:
            items
              .map(
                (entry) =>
                  entry.text
              )
              .join("\n"),
        };
      }
    }


    return {
      found: false,

      expiryDate: "",

      originalText: "",

      confidence: 0,

      needsConfirmation:
        false,

      source:
        "local-ocr",

      allText:
        items
          .map(
            (item) =>
              item.text
          )
          .join("\n"),
    };
  };