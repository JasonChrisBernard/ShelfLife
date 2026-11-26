import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AddFoodScanner from "../components/AddFoodScanner";
import BarcodeConfirmation from "../components/BarcodeConfirmation";

import {
  scanExpiryWithOcr,
  scanProductTextWithOcr,
} from "../services/expiryOcrService";

import {
  preloadBarcodeWasm,
  scanBarcodeWithWasm,
} from "../services/barcodeWasmService";

import {
  preloadZbarWasm,
  scanBarcodeWithZbar,
} from "../services/zbarWasmService";

import {
  analyzeExpiryImage,
  analyzeProductImage,
  analyzeBarcodeImage,
} from "../services/visionService";


function ScanFood() {

  const navigate = useNavigate();

  // =====================================
  // REFERENCES
  // =====================================

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scannerFrameRef = useRef(null);
  const activeScanRef = useRef(null);


  // =====================================
  // STATES
  // =====================================

  const [selectedMode, setSelectedMode] =
    useState("product");

  const [cameraFacing, setCameraFacing] =
    useState("environment");

  const [cameraError, setCameraError] =
    useState("");

  const [cameraReady, setCameraReady] =
    useState(false);

  const [cameraRetry, setCameraRetry] =
    useState(0);

  const [capturedImage, setCapturedImage] =
    useState(null);

  const [scanImage, setScanImage] =
    useState(null);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [productResult, setProductResult] =
    useState(null);

  const [expiryResult, setExpiryResult] =
    useState(null);

  const [barcodeResult, setBarcodeResult] =
    useState(null);

  const [analysisError, setAnalysisError] =
    useState("");


  // =====================================
  // CAMERA LIFECYCLE
  // =====================================

  useEffect(() => {

    let cancelled = false;
    let currentStream = null;

    const openCamera = async () => {

      setCameraError("");
      setCameraReady(false);

      try {

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: cameraFacing,
              },
              width: {
                ideal: 1920,
              },
              height: {
                ideal: 1080,
              },
            },
            audio: false,
          });

        if (cancelled) {
          stream.getTracks().forEach(
            (track) => track.stop()
          );
          return;
        }

        currentStream = stream;
        streamRef.current = stream;

        const video = videoRef.current;

        if (!video) {
          throw new Error(
            "Camera preview unavailable"
          );
        }

        video.srcObject = stream;

        await video.play();

        if (!cancelled) {

          setCameraReady(true);

          console.log(
            "Camera resolution:",
            video.videoWidth,
            video.videoHeight
          );
        }

      } catch (error) {

        currentStream?.getTracks().forEach(
          (track) => track.stop()
        );

        if (
          currentStream &&
          streamRef.current === currentStream
        ) {
          streamRef.current = null;
        }

        if (cancelled) return;

        console.error("Camera error:", error);

        setCameraError(
          "Camera access failed. Please allow camera permission and try again."
        );

        setCameraReady(false);
      }
    };

    openCamera();

    return () => {

      cancelled = true;

      currentStream?.getTracks().forEach(
        (track) => track.stop()
      );

      if (
        currentStream &&
        streamRef.current === currentStream
      ) {
        streamRef.current = null;
      }
    };

  }, [cameraFacing, cameraRetry]);


  // =====================================
  // PRELOAD BARCODE ENGINES
  // =====================================

  useEffect(() => {

    if (selectedMode !== "barcode") return;

    console.log("Preloading barcode engines...");

    // PRIMARY READER

    try {
      preloadBarcodeWasm();
    } catch (error) {
      console.warn(
        "ZXing-WASM preload failed:",
        error
      );
    }

    // FIRST FALLBACK

    try {
      preloadZbarWasm();
    } catch (error) {
      console.warn(
        "ZBar-WASM preload failed:",
        error
      );
    }

  }, [selectedMode]);


  // =====================================
  // COMPONENT CLEANUP
  // =====================================

  useEffect(() => {

    return () => {
      activeScanRef.current = null;
    };

  }, []);


  // =====================================
  // CLEAR SCANNER RESULTS
  // =====================================

  const clearScan = () => {

    setCapturedImage(null);
    setScanImage(null);
    setProductResult(null);
    setExpiryResult(null);
    setBarcodeResult(null);
    setAnalysisError("");
  };


  // =====================================
  // RETAKE PHOTO
  // =====================================

  const handleRetake = () => {

    if (activeScanRef.current) return;

    clearScan();
  };


  // =====================================
  // SWITCH CAMERA
  // =====================================

  const switchCamera = () => {

    if (activeScanRef.current) return;

    clearScan();

    setCameraReady(false);

    setCameraFacing((current) =>
      current === "user"
        ? "environment"
        : "user"
    );
  };


  // =====================================
  // CHANGE SCANNER MODE
  // =====================================

  const handleModeChange = (mode) => {

    if (activeScanRef.current) return;

    clearScan();

    setSelectedMode(mode);
  };


  // =====================================
  // CLOSE SCANNER
  // =====================================

  const handleClose = () => {

    activeScanRef.current = null;

    streamRef.current?.getTracks().forEach(
      (track) => track.stop()
    );

    streamRef.current = null;

    navigate(-1);
  };


  // =====================================
  // CAPTURE PHOTO
  // =====================================

  const capturePhoto = () => {

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      !cameraReady ||
      activeScanRef.current
    ) {
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (!videoWidth || !videoHeight) return;

    const isBarcode =
      selectedMode === "barcode";


    // ===================================
    // FULL IMAGE PREVIEW
    // ===================================

    const previewMax =
      isBarcode ? 1920 : 1280;

    const previewScale = Math.min(
      1,
      previewMax / videoWidth,
      previewMax / videoHeight
    );

    canvas.width = Math.round(
      videoWidth * previewScale
    );

    canvas.height = Math.round(
      videoHeight * previewScale
    );

    const previewContext =
      canvas.getContext("2d");

    if (!previewContext) return;


    // RESET PREVIOUS RESULTS

    setScanImage(null);
    setProductResult(null);
    setExpiryResult(null);
    setBarcodeResult(null);
    setAnalysisError("");


    // ===================================
    // CAMERA MIRROR HANDLING
    // ===================================

    previewContext.save();

    if (
      cameraFacing === "user" &&
      !isBarcode
    ) {

      previewContext.translate(
        canvas.width,
        0
      );

      previewContext.scale(-1, 1);
    }

    previewContext.drawImage(
      video,
      0,
      0,
      videoWidth,
      videoHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    previewContext.restore();

    const fullImage = canvas.toDataURL(
      "image/jpeg",
      isBarcode ? 0.95 : 0.75
    );


    // ===================================
    // BARCODE-SPECIFIC IMAGE CROP
    // ===================================

    if (isBarcode) {

      const frame = scannerFrameRef.current;

      if (frame) {

        const videoRect =
          video.getBoundingClientRect();

        const frameRect =
          frame.getBoundingClientRect();

        const fit =
          getComputedStyle(video).objectFit;

        const scale =
          fit === "contain"
            ? Math.min(
                videoRect.width / videoWidth,
                videoRect.height / videoHeight
              )
            : Math.max(
                videoRect.width / videoWidth,
                videoRect.height / videoHeight
              );

        const scaleX =
          fit === "fill"
            ? videoRect.width / videoWidth
            : scale;

        const scaleY =
          fit === "fill"
            ? videoRect.height / videoHeight
            : scale;

        if (scaleX > 0 && scaleY > 0) {

          const offsetX =
            (
              videoRect.width -
              videoWidth * scaleX
            ) / 2;

          const offsetY =
            (
              videoRect.height -
              videoHeight * scaleY
            ) / 2;

          const left = Math.max(
            0,
            (
              frameRect.left -
              videoRect.left -
              offsetX
            ) / scaleX
          );

          const top = Math.max(
            0,
            (
              frameRect.top -
              videoRect.top -
              offsetY
            ) / scaleY
          );

          const right = Math.min(
            videoWidth,
            (
              frameRect.right -
              videoRect.left -
              offsetX
            ) / scaleX
          );

          const bottom = Math.min(
            videoHeight,
            (
              frameRect.bottom -
              videoRect.top -
              offsetY
            ) / scaleY
          );

          const width =
            Math.floor(right - left);

          const height =
            Math.floor(bottom - top);

          if (width > 0 && height > 0) {

            const sourceX =
              cameraFacing === "user"
                ? videoWidth - right
                : left;

            const barcodeCanvas =
              document.createElement("canvas");

            barcodeCanvas.width = width;
            barcodeCanvas.height = height;

            const ctx =
              barcodeCanvas.getContext("2d");

            if (ctx) {

              ctx.drawImage(
                video,
                sourceX,
                top,
                width,
                height,
                0,
                0,
                width,
                height
              );

              setScanImage(
                barcodeCanvas.toDataURL(
                  "image/png"
                )
              );

              console.log(
                "Barcode scanner frame extracted:",
                width,
                height
              );
            }
          }
        }
      }

      setCapturedImage(fullImage);

      return;
    }


    // ===================================
    // PRODUCT / EXPIRY IMAGE CROP
    // ===================================

    const cropCanvas =
      document.createElement("canvas");

    const cropContext =
      cropCanvas.getContext("2d");

    if (cropContext) {

      const cropWidth =
        videoWidth * 0.8;

      const cropHeight =
        videoHeight * 0.8;

      const cropX =
        (videoWidth - cropWidth) / 2;

      const cropY =
        (videoHeight - cropHeight) / 2;

      const cropScale = Math.min(
        1,
        1024 / cropWidth,
        1024 / cropHeight
      );

      cropCanvas.width = Math.round(
        cropWidth * cropScale
      );

      cropCanvas.height = Math.round(
        cropHeight * cropScale
      );

      cropContext.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      setScanImage(
        cropCanvas.toDataURL(
          "image/jpeg",
          0.75
        )
      );

      console.log(
        "Cropped scan image created"
      );
    }

    setCapturedImage(fullImage);

    console.log("Full preview created");
  };


  // =====================================
  // USE PHOTO / ANALYZE IMAGE
  // =====================================

  const handleUsePhoto = async () => {

    // PREVENT DUPLICATE REQUESTS

    if (
      !capturedImage ||
      activeScanRef.current
    ) {
      return;
    }

    const scanToken = {};

    activeScanRef.current = scanToken;

    const isCurrent = () =>
      activeScanRef.current === scanToken;

    const imageToAnalyze =
      scanImage || capturedImage;

    setAnalyzing(true);
    setAnalysisError("");
    setProductResult(null);
    setExpiryResult(null);
    setBarcodeResult(null);

    try {


      // =================================
      // 1. PRODUCT SCANNING MODE
      // PADDLEOCR + GEMINI
      // =================================

      if (selectedMode === "product") {

        let ocrText = "";

        console.log(
          "Running PaddleOCR before Gemini..."
        );

        try {

          const ocrResult =
            await scanProductTextWithOcr(
              imageToAnalyze
            );

          ocrText = ocrResult.text || "";

          console.log(
            "Product OCR text:",
            ocrText
          );

        } catch (ocrError) {

          console.warn(
            "Product OCR failed. Continuing with Gemini image recognition.",
            ocrError
          );
        }

        if (!isCurrent()) return;

        console.log(
          ocrText
            ? "Sending image + OCR text to Gemini..."
            : "No useful OCR text. Sending image to Gemini..."
        );

        const data =
          await analyzeProductImage(
            imageToAnalyze,
            ocrText
          );

        if (!isCurrent()) return;

        console.log(
          "Product response:",
          data
        );

        setProductResult({
          ...data.product,
          detectedText: ocrText,
        });

        return;
      }


      // =================================
      // 2. EXPIRY SCANNING MODE
      // PADDLEOCR -> GEMINI
      // =================================

      if (selectedMode === "expiry") {

        console.log("Running local OCR...");

        const ocrResult =
          await scanExpiryWithOcr(
            imageToAnalyze
          );

        if (!isCurrent()) return;

        console.log(
          "OCR result:",
          ocrResult
        );

        // LOCAL OCR SUCCESS

        if (ocrResult.found) {

          setExpiryResult(ocrResult);

          return;
        }

        // GEMINI FALLBACK

        console.log(
          "OCR failed. Using Gemini fallback..."
        );

        const data =
          await analyzeExpiryImage(
            imageToAnalyze
          );

        if (!isCurrent()) return;

        console.log(
          "Gemini expiry response:",
          data
        );

        setExpiryResult({
          ...data.expiry,
          source: "gemini-fallback",
        });

        return;
      }


      // =================================
      // 3. BARCODE SCANNING MODE
      // =================================

      if (selectedMode === "barcode") {

        const startTime = performance.now();

        const logTotal = () => {

          console.log(
            "Total scanning time:",
            Math.round(
              performance.now() - startTime
            ),
            "ms"
          );
        };


        // ===============================
        // PRIMARY READER — ZXING-WASM
        // ===============================

        console.log("Starting ZXing-WASM...");

        let localResult = null;

        try {

          localResult =
            await scanBarcodeWithWasm(
              capturedImage,
              scanImage
            );

        } catch (error) {

          console.warn(
            "ZXing-WASM failed:",
            error
          );
        }

        if (!isCurrent()) return;

        console.log(
          "ZXing-WASM result:",
          localResult
        );

        // ZXING SUCCESS

        if (localResult?.found) {

          setBarcodeResult(localResult);

          console.log(
            "ZXing barcode detected:",
            localResult.barcode
          );

          logTotal();

          return;
        }


        // ===============================
        // FIRST FALLBACK — ZBAR-WASM
        // ===============================

        console.log(
          "ZXing failed. Starting ZBar-WASM..."
        );

        let zbarResult = null;

        try {

          zbarResult =
            await scanBarcodeWithZbar(
              capturedImage,
              scanImage
            );

        } catch (error) {

          console.warn(
            "ZBar-WASM failed:",
            error
          );
        }

        if (!isCurrent()) return;

        console.log(
          "ZBar-WASM result:",
          zbarResult
        );

        // ZBAR SUCCESS

        if (zbarResult?.found) {

          setBarcodeResult(zbarResult);

          console.log(
            "ZBar barcode detected:",
            zbarResult.barcode
          );

          logTotal();

          return;
        }


        // ===============================
        // SECOND FALLBACK — GEMINI VISION
        // ===============================

        console.log(
          "Both local scanners failed."
        );

        console.log(
          "Activating direct Gemini fallback..."
        );

        const data =
          await analyzeBarcodeImage(
            capturedImage
          );

        if (!isCurrent()) return;

        const result = data.barcode;

        console.log(
          "Gemini barcode result:",
          result
        );

        logTotal();


        // ALL SCANNERS FAILED

        if (!result?.found) {

          setAnalysisError(
            "No valid barcode detected. Please retake the photo."
          );

          return;
        }


        // GEMINI RECOGNITION SUCCESS

        setBarcodeResult(result);

        console.log(
          "Gemini barcode detected:",
          result.barcode
        );

        return;
      }

    } catch (error) {

      if (!isCurrent()) return;

      console.error(
        "Scanner error:",
        error
      );

      setAnalysisError(
        error.message ||
        "Could not analyze image."
      );

    } finally {

      if (isCurrent()) {

        activeScanRef.current = null;

        setAnalyzing(false);
      }
    }
  };


  // =====================================
  // SCANNER MODE TITLE
  // =====================================

  const getModeTitle = () => {

    if (selectedMode === "expiry") {
      return "Scan Expiry Date";
    }

    if (selectedMode === "barcode") {
      return "Scan Barcode";
    }

    return "Scan Product";
  };


  // =====================================
  // SCANNER HELP TEXT
  // =====================================

  const getHelpText = () => {

    if (selectedMode === "expiry") {
      return "Point the camera clearly at the expiry date.";
    }

    if (selectedMode === "barcode") {
      return "Place the barcode inside the camera frame.";
    }

    return "Point the camera at the food or packaging.";
  };


  // =====================================
  // CHECK BARCODE RESULT
  // =====================================

  const hasBarcode =
    selectedMode === "barcode" &&
    Boolean(barcodeResult?.found);


  // =====================================
  // USER INTERFACE
  // =====================================

  return (

    <main className="scan-page">

      {/* TOP BAR */}

      <div className="scan-topbar">

        <button
          className="scan-close-button"
          onClick={handleClose}
          type="button"
          aria-label="Close scanner"
        >
          ✕
        </button>

        <h1>Add Food</h1>

        <div className="scan-topbar-space" />

      </div>


      {/* CAMERA AREA */}

      <div className="scanner-camera">

        {/* CAMERA PREVIEW */}

        <video
          ref={videoRef}
          style={{
            display: capturedImage
              ? "none"
              : undefined,
          }}
          className={
            cameraFacing === "user"
              ? "scanner-video selfie-camera"
              : "scanner-video"
          }
          autoPlay
          playsInline
          muted
        />


        {/* CAPTURED IMAGE */}

        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured food"
            className="captured-image"
          />
        )}


        {/* ANALYZING INDICATOR */}

        {analyzing && (
          <div
            className="scanner-analyzing"
            role="status"
          >

            <div className="scanner-spinner" />

            <p>Analyzing image...</p>

          </div>
        )}


        {/* PRODUCT RESULT */}

        {productResult && (

          <div className="product-scan-result">

            {productResult.recognized ? (

              <>

                <h3>✨ Product Recognized</h3>

                <p>
                  <strong>Name:</strong>{" "}
                  {productResult.productName}
                </p>

                <p>
                  <strong>Category:</strong>{" "}
                  {productResult.category}
                </p>

                <p>
                  <strong>
                    Suggested storage:
                  </strong>{" "}
                  {
                    productResult
                      .suggestedStorageLocation
                  }
                </p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {productResult.productConfidence}%
                </p>

                {productResult.expiryDateFound ? (

                  <p>
                    <strong>Expiry:</strong>{" "}
                    {productResult.expiryDate}
                  </p>

                ) : (

                  <p>Expiry date not visible.</p>

                )}

                {productResult.notes && (
                  <p>{productResult.notes}</p>
                )}

              </>

            ) : (

              <>

                <h3>Product not recognized</h3>

                <p>
                  Try moving the product closer
                  and keeping it inside the frame.
                </p>

              </>

            )}

          </div>
        )}


        {/* EXPIRY RESULT */}

        {expiryResult && (

          <div className="product-scan-result">

            <h3>📅 Expiry Scan</h3>

            {expiryResult.found ? (

              <>

                <p>
                  <strong>Expiry Date:</strong>{" "}
                  {expiryResult.expiryDate}
                </p>

                <p>
                  <strong>Detected:</strong>{" "}
                  {expiryResult.originalText}
                </p>

                <p>
                  <strong>Confidence:</strong>{" "}
                  {expiryResult.confidence}%
                </p>

                <p>
                  <strong>Source:</strong>{" "}

                  {
                    expiryResult.source ===
                      "local-ocr"
                      ? "Local OCR"
                      : "Gemini fallback"
                  }

                </p>

              </>

            ) : (

              <p>
                No clear expiry date was found.
                Try taking a closer photo.
              </p>

            )}

          </div>
        )}


        {/* SWITCH CAMERA */}

        {!capturedImage &&
          !cameraError &&
          cameraReady && (

            <button
              className="switch-camera-button"
              onClick={switchCamera}
              type="button"
              aria-label="Switch camera"
              title="Switch camera"
            >
              🔄
            </button>

          )}


        {/* CAMERA ERROR */}

        {cameraError && (

          <div className="camera-error">

            <h2>Camera unavailable</h2>

            <p>{cameraError}</p>

            <button
              type="button"
              onClick={() =>
                setCameraRetry(
                  (current) => current + 1
                )
              }
            >
              Try Again
            </button>

          </div>
        )}


        {/* CAMERA LOADING */}

        {!cameraReady &&
          !cameraError &&
          !capturedImage && (

            <div className="camera-loading">
              Starting camera...
            </div>

          )}


        {/* SCANNER FRAME */}

        {!cameraError && !hasBarcode && (

          <div
            className="scanner-frame"
            ref={scannerFrameRef}
          >

            <span className="corner top-left" />

            <span className="corner top-right" />

            <span className="corner bottom-left" />

            <span className="corner bottom-right" />

            {!capturedImage && (

              <div className="scanner-mode-title">

                <span>📷</span>

                <h2>{getModeTitle()}</h2>

              </div>

            )}

          </div>

        )}

      </div>


      {/* HIDDEN CANVAS */}

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />


      {/* BOTTOM CONTROLS */}

      <div className="scanner-bottom-panel">
        {/* TEMPORARY BARCODE IMAGE DEBUGGER */}

{import.meta.env.DEV &&
  selectedMode === "barcode" &&
  scanImage && (

    <div style={{
      padding: "10px",
      background: "#ffffff",
      color: "#000000",
    }}>

      <p>Actual barcode crop</p>

      <img
        src={scanImage}
        alt="Barcode crop"
        style={{
          width: "100%",
          maxWidth: "400px",
          objectFit: "contain",
        }}
      />

      <a
        href={scanImage}
        download="barcode-crop.png"
      >
        Download cropped image
      </a>

    </div>
)}
        {!capturedImage && (

          <>

            <AddFoodScanner
              selectedMode={selectedMode}
              onSelectMode={handleModeChange}
            />

            <button
              className="capture-button"
              onClick={capturePhoto}
              disabled={
                !cameraReady ||
                Boolean(cameraError) ||
                analyzing
              }
              type="button"
              aria-label="Capture image"
            >
              <span />
            </button>

            <p className="scanner-help-text">
              {getHelpText()}
            </p>

          </>

        )}


        {/* PHOTO PREVIEW ACTIONS */}

        {capturedImage && !hasBarcode && (

          <div className="capture-actions">

            <button
              className="retake-button"
              onClick={handleRetake}
              disabled={analyzing}
              type="button"
            >
              Retake
            </button>

            <button
              className="use-photo-button"
              onClick={handleUsePhoto}
              disabled={analyzing}
              type="button"
            >
              {analyzing
                ? "Analyzing..."
                : "Use Photo"}
            </button>

          </div>

        )}


        {/* ANALYSIS ERROR */}

        {analysisError && (

          <p
            className="scanner-help-text"
            role="alert"
          >
            {analysisError}
          </p>

        )}


        {/* BARCODE CONFIRMATION */}

        {hasBarcode && (

          <BarcodeConfirmation
            key={barcodeResult.barcode}
            barcodeResult={barcodeResult}
            onScanAgain={handleRetake}
          />

        )}

      </div>

    </main>
  );
}

export default ScanFood;