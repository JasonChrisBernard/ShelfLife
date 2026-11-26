import {
  isValidGTIN,
} from "../utils/barcodeUtils.js";


// =====================================
// OPEN FOOD FACTS
// =====================================

const lookupOpenFoodFacts = async (barcode) => {

  console.log(
    "Searching Open Food Facts:",
    barcode
  );

  const fields = [
    "product_name",
    "product_name_en",
    "brands",
    "categories",
    "quantity",
    "image_front_url",
  ].join(",");

  const url = new URL(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}`
  );

  url.searchParams.set("fields", fields);

  const contact =
    process.env.OPEN_FOOD_FACTS_CONTACT;

  if (!contact) {
    throw new Error(
      "Open Food Facts contact email is missing"
    );
  }

  const response = await fetch(url, {

    headers: {

      Accept: "application/json",

      "User-Agent":
        `ShelfLife/1.0 (${contact})`,
    },

    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {

    throw new Error(
      `Open Food Facts error: ${response.status}`
    );
  }

  const data = await response.json();

  if (
    data.status !== 1 ||
    !data.product
  ) {
    return null;
  }

  const product = data.product;

  const name =
    product.product_name_en?.trim() ||
    product.product_name?.trim();

  if (!name) return null;

  return {

    barcode,

    name,

    brand: product.brands || "",

    category: product.categories || "",

    packageSize: product.quantity || "",

    imageUrl: product.image_front_url || "",

    source: "Open Food Facts",
  };
};

// =====================================
// UPCITEMDB LOOKUP
// =====================================

const lookupUPCitemdb = async (barcode) => {

  console.log(
    "Searching UPCitemdb:",
    barcode
  );

  const url = new URL(
    "https://api.upcitemdb.com/prod/trial/lookup"
  );

  url.searchParams.set("upc", barcode);

  const response = await fetch(url, {

    headers: {
      Accept: "application/json",
    },

    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {

    throw new Error(
      `UPCitemdb error: ${response.status}`
    );
  }

  const data = await response.json();

  if (
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {
    return null;
  }


  // Ensure the returned item matches
  // the requested barcode

  const product = data.items.find((item) => {

    const codes = [
      item.ean,
      item.upc,
    ];

    return codes.some((code) => {

      if (
        typeof code !== "string" ||
        !isValidGTIN(code)
      ) {
        return false;
      }

      return (
        code.padStart(14, "0") ===
        barcode.padStart(14, "0")
      );
    });
  });

  if (!product?.title?.trim()) {
    return null;
  }

  return {

    barcode,

    name: product.title,

    brand: product.brand || "",

    category: product.category || "",

    packageSize: product.size || "",

    imageUrl: product.images?.[0] || "",

    source: "UPCitemdb",
  };
};

// =====================================
// HYBRID PRODUCT LOOKUP
// =====================================

export const lookupProductByBarcode =
  async (barcode) => {

    if (!isValidGTIN(barcode)) {

      throw new Error(
        "Invalid barcode checksum"
      );
    }

    const startTime = performance.now();

   const providers = [
  {
    name: "Open Food Facts",
    lookup: lookupOpenFoodFacts,
  },
  {
    name: "UPCitemdb",
    lookup: lookupUPCitemdb,
  },
];

    let failedProviders = 0;

    for (const provider of providers) {

      try {

        const product =
          await provider.lookup(barcode);

        if (product) {

          console.log(
            `Product found in ${provider.name}`
          );

          console.log(
            "Product name:",
            product.name
          );

          return {

            found: true,

            barcode,

            product,

            duration: Math.round(
              performance.now() - startTime
            ),
          };
        }

        console.log(
          `Product not found in ${provider.name}`
        );

      } catch (error) {

        failedProviders++;

        console.warn(
          `${provider.name} lookup failed:`,
          error.message
        );
      }
    }


    // Do not incorrectly report "not found"
    // if a database was unavailable

    if (failedProviders > 0) {

      throw new Error(
        "Product lookup service temporarily unavailable"
      );
    }

    return {

      found: false,

      barcode,

      product: null,

      duration: Math.round(
        performance.now() - startTime
      ),
    };
  };