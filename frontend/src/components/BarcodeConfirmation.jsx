import { useState, useEffect, useRef } from "react";

import {
  lookupBarcodeProduct,
} from "../services/visionService";


const recognitionSources = {
  aspose: "Aspose Barcode API",
  gemini: "Gemini Vision AI",
  "gemini-fallback": "Gemini Vision AI",
  quagga2: "Quagga2 — Local Barcode Reader",
  "local-barcode": "Local Barcode Reader",
  "local-ocr": "Local OCR",
  "zxing-wasm": "ZXing WASM",
  opencv: "OpenCV",
};

const BarcodeConfirmation = ({
  barcodeResult,
  onScanAgain,
}) => {

  const [barcode, setBarcode] =
    useState(barcodeResult.barcode);

  const [loading, setLoading] =
    useState(false);

  const [product, setProduct] =
    useState(null);

  const [error, setError] =
    useState("");

  const requestRef = useRef(null);


  // Cancel lookup when scanner closes
  useEffect(() => {

    return () => {
      requestRef.current?.abort();
    };

  }, []);


  // =====================================
  // CONFIRM AND FIND PRODUCT
  // =====================================

  const handleConfirm = async () => {

    if (loading) return;

    setError("");
    setProduct(null);

    const cleanBarcode =
      barcode.replace(/\s/g, "");

    if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(cleanBarcode)) {

      setError("Enter a valid barcode number.");

      return;
    }

    const controller = new AbortController();

    requestRef.current = controller;

    setLoading(true);

    try {

      const result =
        await lookupBarcodeProduct(
          cleanBarcode,
          controller.signal
        );

      if (controller.signal.aborted) return;

      console.log(
        "Product lookup result:",
        result
      );

      if (!result.found) {

        setError(
          "Barcode confirmed, but product not found in the databases."
        );

        return;
      }

      setProduct(result.product);

    } catch (error) {

      if (!controller.signal.aborted) {
        setError(error.message);
      }

    } finally {

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };


  // =====================================
  // USER INTERFACE
  // =====================================

  return (

    <div className="product-scan-result">

      <h3>Barcode Detected</h3>

      <p>
        Source:{" "}
        {Object.hasOwn(recognitionSources, barcodeResult.source)
          ? recognitionSources[barcodeResult.source]
          : barcodeResult.source || "Unknown source"}
      </p>

      <label htmlFor="confirmed-barcode">
        Confirm Barcode Number
      </label>

      <input
        id="confirmed-barcode"
        type="text"
        inputMode="numeric"
        value={barcode}
        disabled={loading}
        maxLength={14}
        onChange={(event) => {

          setBarcode(
            event.target.value.replace(/\D/g, "")
          );

          setProduct(null);
          setError("");
        }}
      />

      <p>
        Check that the number matches
        your product packaging.
      </p>

      <button
        type="button"
        className="use-photo-button"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading
          ? "Finding Product..."
          : "Confirm & Find Product"}
      </button>

      {error && (
        <p role="alert">{error}</p>
      )}

      {product && (

        <div className="product-lookup-result">

          <h3>Product Found</h3>

          <p>
            <strong>Name:</strong>{" "}
            {product.name}
          </p>

          <p>
            <strong>Brand:</strong>{" "}
            {product.brand || "Unknown"}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {product.category || "Unknown"}
          </p>

          <p>
            <strong>Package Size:</strong>{" "}
            {product.packageSize || "Unknown"}
          </p>

          <p>
            <strong>Barcode:</strong>{" "}
            {product.barcode}
          </p>

          <p>
            <strong>Database:</strong>{" "}
            {product.source}
          </p>

        </div>
      )}

      <button
        type="button"
        className="use-photo-button"
        onClick={onScanAgain}
      >
        Scan Again
      </button>

    </div>
  );
};

export default BarcodeConfirmation;
