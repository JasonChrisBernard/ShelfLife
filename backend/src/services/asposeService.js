const TOKEN_URL =
  "https://id.aspose.cloud/connect/token";

const BARCODE_URL =
  "https://api.aspose.cloud/v4.0/barcode/recognize-body";


// =====================================
// 1. ACCESS TOKEN CACHE
// =====================================

let accessToken = null;
let tokenExpiresAt = 0;


// =====================================
// 2. GET ASPOSE ACCESS TOKEN
// =====================================

const getAccessToken = async () => {

  // Reuse existing token
  if (
    accessToken &&
    Date.now() < tokenExpiresAt
  ) {
    return accessToken;
  }

  const clientId =
    process.env.ASPOSE_CLIENT_ID;

  const clientSecret =
    process.env.ASPOSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Aspose credentials are missing"
    );
  }

  const response = await fetch(
    TOKEN_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",

        Accept: "application/json",
      },

      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),

      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Aspose authentication failed (${response.status})`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Aspose token missing");
  }

  accessToken = data.access_token;

  tokenExpiresAt =
    Date.now() +
    Number(data.expires_in) * 1000 -
    60000;

  console.log("Aspose authentication successful");

  return accessToken;
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

  const expectedCheckDigit =
    (10 - (sum % 10)) % 10;

  return (
    expectedCheckDigit ===
    Number(barcode[barcode.length - 1])
  );
};


// =====================================
// 4. RECOGNIZE BARCODE IMAGE
// =====================================

export const scanBarcodeWithAspose =
  async (base64Data) => {

    const token = await getAccessToken();

    console.log(
      "Scanning barcode with Aspose..."
    );

    const startTime = performance.now();

    const response = await fetch(
      BARCODE_URL,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type":
            "application/json",

          Accept: "application/json",
        },

        body: JSON.stringify({

          barcodeTypes: [
            "EAN13",
            "EAN8",
            "UPCA",
          ],

          fileBase64: base64Data,

          recognitionMode: "Normal",
          recognitionImageKind: "Photo",

        }),

        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {

  const errorDetails = await response.text();

  console.error(
    "Aspose HTTP status:",
    response.status
  );

  console.error(
    "Aspose error details:",
    errorDetails
  );

  if (response.status === 401) {
    accessToken = null;
    tokenExpiresAt = 0;
  }

  throw new Error(
    `Aspose barcode scan failed (${response.status})`
  );
}

    const data = await response.json();

    const duration = Math.round(
      performance.now() - startTime
    );

    const barcodes = data.barcodes || [];

        console.log(
      "Raw Aspose response:",
      JSON.stringify(data, null, 2)
    );

    console.log(
      "Detected barcodes:",
      barcodes
    );

    const validBarcodes = [
      ...new Set(
        barcodes
          .map((item) =>
            item.barcodeValue?.trim()
          )
          .filter(isValidGTIN)
      ),
    ];

    if (validBarcodes.length !== 1) {

      console.log(
        "No unique valid barcode found"
      );

      return {
        found: false,
        barcode: "",
        source: "aspose",
        needsConfirmation: false,
        duration,
      };
    }

    const barcode = validBarcodes[0];

    console.log("Barcode detected:", barcode);
    console.log("Scan duration:", duration, "ms");

    return {
      found: true,
      barcode,
      source: "aspose",
      method: "cloud-api",
      needsConfirmation: true,
      duration,
    };
  };