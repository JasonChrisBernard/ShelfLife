import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import AddFoodScanner from "../components/AddFoodScanner";
import BarcodeConfirmation from "../components/BarcodeConfirmation";
import LiveBarcodeOverlay from "../components/LiveBarcodeOverlay";

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

import {
  preloadBarcodePreprocessor,
  preprocessBarcodeImage,
} from "../services/barcodePreprocessingService";


// =====================================
// SCAN FOOD COMPONENT
// =====================================

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
  // ALL REACT HOOKS MUST BE INSIDE
  // THE COMPONENT
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

  const [
    liveBarcodeDetection,
    setLiveBarcodeDetection,
  ] = useState(null);

  const [
    preprocessingResult,
    setPreprocessingResult,
  ] = useState(null);

  const [
    preprocessingLoading,
    setPreprocessingLoading,
  ] = useState(false);


  // =====================================
  // BARCODE READY CONDITION
  // ONLY ALLOW CAPTURE WHEN GREEN
  // =====================================

  const barcodeReady =

    liveBarcodeDetection?.found === true &&

    liveBarcodeDetection?.verified === true &&

    liveBarcodeDetection?.boxes?.length === 1;

  const [
  capturedBarcode,
  setCapturedBarcode,
] = useState(null);


  // =====================================
  // PRELOAD OPENCV
  // =====================================

  useEffect(() => {

    if (!import.meta.env.DEV) return;

    if (selectedMode !== "barcode") return;

    preloadBarcodePreprocessor()

      .catch((error) => {

        console.warn(
          "OpenCV preload failed:",
          error
        );
      });

  }, [selectedMode]);


  // =====================================
  // AUTOMATIC IMAGE PREPROCESSING
  // DEVELOPMENT DIAGNOSTICS
  // =====================================

  useEffect(() => {

    if (
      !import.meta.env.DEV ||
      selectedMode !== "barcode" ||
      capturedBarcode?.found ||
      !capturedImage
    ) {

      setPreprocessingResult(null);
      setPreprocessingLoading(false);

      return;
    }

    let cancelled = false;

    const processImage = async () => {

      setPreprocessingResult(null);
      setPreprocessingLoading(true);

      try {

        const result =
          await preprocessBarcodeImage(
            capturedImage
          );

        if (cancelled) return;

        setPreprocessingResult(result);

        console.log(
          "OpenCV preprocessing result:",
          {
            found: result.found,
            duration: result.duration,
            width: result.width,
            height: result.height,
            reason: result.reason,
          }
        );

      } catch (error) {

        if (cancelled) return;

        console.warn(
          "Barcode preprocessing failed:",
          error.message
        );

        setPreprocessingResult({
          found: false,
          reason: error.message,
        });

      } finally {

        if (!cancelled) {

          setPreprocessingLoading(false);
        }
      }
    };

    processImage();

    return () => {

      cancelled = true;
    };

  }, [
    capturedImage,
    selectedMode,
    capturedBarcode,
  ]);


  // =====================================
  // CAMERA LIFECYCLE
  // =====================================

  useEffect(() => {

    let cancelled = false;
    let currentStream = null;

    const openCamera = async () => {

      setCameraError("");
      setCameraReady(false);
      setLiveBarcodeDetection(null);

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


        // CAMERA CLOSED BEFORE INITIALIZATION

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

        console.error(
          "Camera error:",
          error
        );

        setCameraError(
          "Camera access failed. Please allow camera permission and try again."
        );

        setCameraReady(false);
      }
    };

    openCamera();


    // STOP CAMERA WHEN COMPONENT CLOSES

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

  }, [
    cameraFacing,
    cameraRetry,
  ]);


  // =====================================
  // PRELOAD BARCODE ENGINES
  // =====================================

  useEffect(() => {

    if (selectedMode !== "barcode") return;

    console.log(
      "Preloading barcode engines..."
    );


    // ZXING-WASM

    try {

      preloadBarcodeWasm();

    } catch (error) {

      console.warn(
        "ZXing-WASM preload failed:",
        error
      );
    }


    // ZBAR-WASM

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

    setLiveBarcodeDetection(null);

    setPreprocessingResult(null);

    setPreprocessingLoading(false);

    setCapturedBarcode(null);
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

    if (mode === selectedMode) return;

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
  // AUTOMATIC BARCODE CROPPING
  // USE DETECTED BARCODE COORDINATES
  // =====================================

  const createBarcodeCrop = (
    sourceCanvas,
    detection
  ) => {

    const box = detection?.boxes?.[0];

    if (
      !Array.isArray(box) ||
      box.length !== 4
    ) {

      return null;
    }


    // ORIGINAL IMAGE DIMENSIONS

    const imageWidth = sourceCanvas.width;

    const imageHeight = sourceCanvas.height;


    // VALIDATE DETECTED COORDINATES

    const validPoints = box.every(
      (point) =>

        Number.isFinite(point?.x) &&
        Number.isFinite(point?.y)
    );

    if (!validPoints) {

      return null;
    }


    // CONVERT NORMALIZED COORDINATES
    // INTO ACTUAL IMAGE PIXELS

    const points = box.map((point) => ({

      x: point.x * imageWidth,

      y: point.y * imageHeight,
    }));


    // CALCULATE BOUNDING RECTANGLE

    const minX = Math.min(
      ...points.map((point) => point.x)
    );

    const maxX = Math.max(
      ...points.map((point) => point.x)
    );

    const minY = Math.min(
      ...points.map((point) => point.y)
    );

    const maxY = Math.max(
      ...points.map((point) => point.y)
    );


    const barcodeWidth = maxX - minX;

    const barcodeHeight = maxY - minY;


    if (
      barcodeWidth < 10 ||
      barcodeHeight < 10
    ) {

      return null;
    }


    // ===================================
    // ADD EXTRA MARGINS
    // ===================================

    const paddingX = Math.max(

      20,

      barcodeWidth * 0.25
    );

    const paddingY = Math.max(

      20,

      barcodeHeight * 0.35
    );


    // KEEP CROP INSIDE IMAGE BOUNDARIES

    const left = Math.max(

      0,

      Math.floor(minX - paddingX)
    );

    const top = Math.max(

      0,

      Math.floor(minY - paddingY)
    );

    const right = Math.min(

      imageWidth,

      Math.ceil(maxX + paddingX)
    );

    const bottom = Math.min(

      imageHeight,

      Math.ceil(maxY + paddingY)
    );


    const cropWidth = right - left;

    const cropHeight = bottom - top;


    if (
      cropWidth <= 0 ||
      cropHeight <= 0
    ) {

      return null;
    }


    // ===================================
    // CREATE AUTOMATIC CROP
    // ===================================

    const cropCanvas =
      document.createElement("canvas");

    cropCanvas.width = cropWidth;

    cropCanvas.height = cropHeight;


    const context =
      cropCanvas.getContext("2d");

    if (!context) return null;


    context.drawImage(

      sourceCanvas,

      left,
      top,

      cropWidth,
      cropHeight,

      0,
      0,

      cropWidth,
      cropHeight
    );


    console.log(

      "Automatic barcode crop created:",

      cropWidth,

      cropHeight
    );


    return cropCanvas.toDataURL(
      "image/png"
    );
  };


  // =====================================
  // CAPTURE PHOTO
  // =====================================

  const capturePhoto = () => {
        // =====================================
    // CAPTURE ALREADY VERIFIED BARCODE
    // =====================================

    if (selectedMode === "barcode") {

      const detection = liveBarcodeDetection;

      if (
        !barcodeReady ||
        !cameraReady ||
        cameraError ||
        activeScanRef.current ||
        !detection?.barcode ||
        !detection?.frameImage ||
        !Number.isFinite(detection.capturedAt)
      ) {
        return;
      }


      // PREVENT STALE BARCODE CAPTURE

      const detectionAge =
        performance.now() - detection.capturedAt;

      if (detectionAge > 1500) {

        console.warn(
          "Barcode detection expired. Hold steady."
        );

        return;
      }


  // RESET PREVIOUS RESULTS

  setBarcodeResult(null);
  setProductResult(null);
  setExpiryResult(null);
  setAnalysisError("");
  setScanImage(null);
  setPreprocessingResult(null);


  // STORE VERIFIED BARCODE NUMBER

  setCapturedBarcode({

    found: true,

    barcode: detection.barcode,

    source: "quagga2",

    needsConfirmation: true,

    duration: detection.duration,
  });


  // STORE EXACT VERIFIED PHOTOGRAPH

  setCapturedImage(
    detection.frameImage
  );


  console.log(
    "Verified barcode captured:",
    detection.barcode
  );

  console.log(
    "Recognition source: Quagga2"
  );

  return;
}

    const video = videoRef.current;

    const canvas = canvasRef.current;


    // BARCODE MUST BE GREEN

    if (
      selectedMode === "barcode" &&
      !barcodeReady
    ) {

      console.log(
        "Waiting for verified barcode..."
      );

      return;
    }


    // VALIDATE CAMERA

    if (
      !video ||
      !canvas ||
      !cameraReady ||
      activeScanRef.current ||
      video.readyState < 2
    ) {

      return;
    }


    const videoWidth = video.videoWidth;

    const videoHeight = video.videoHeight;


    if (!videoWidth || !videoHeight) {

      return;
    }


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

    setPreprocessingResult(null);


    // ===================================
    // CAMERA MIRROR HANDLING
    // ===================================

    previewContext.save();


    // DO NOT MIRROR BARCODE IMAGES

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


    // PRESERVE FULL ORIGINAL IMAGE

    const fullImage = canvas.toDataURL(

      "image/jpeg",

      isBarcode ? 0.95 : 0.75
    );


    // ===================================
    // AUTOMATIC BARCODE REGION CROP
    // ===================================

    if (isBarcode) {

      const automaticCrop =
        createBarcodeCrop(

          canvas,

          liveBarcodeDetection
        );


      if (automaticCrop) {

        setScanImage(automaticCrop);

        console.log(
          "Using automatic barcode crop"
        );

      } else {

        console.warn(
          "Automatic crop unavailable. Using original image."
        );

        setScanImage(null);
      }


      setCapturedImage(fullImage);

      console.log(
        "Verified barcode photo captured"
      );

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

    console.log(
      "Full preview created"
    );
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


          ocrText =
            ocrResult.text || "";


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

        console.log(
          "Running local OCR..."
        );


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
          // =====================================
// REUSE VERIFIED BARCODE NUMBER
// =====================================

if (capturedBarcode?.found) {

  const startTime = performance.now();

  setBarcodeResult(capturedBarcode);

  console.log(
    "Using verified barcode:",
    capturedBarcode.barcode
  );

  console.log(
    "Source: Quagga2"
  );

  console.log(
    "ZXing skipped"
  );

  console.log(
    "ZBar skipped"
  );

  console.log(
    "Gemini skipped"
  );

  console.log(
    "Result processing time:",
    Math.round(
      performance.now() - startTime
    ),
    "ms"
  );

  return;
}
        const startTime =
          performance.now();


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

        console.log(
          "Starting ZXing-WASM..."
        );


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


        // GEMINI SUCCESS

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

      return barcodeReady

        ? "Barcode verified. Tap the green capture button."

        : "Point the camera at the barcode and wait for the green outline.";
    }


    return "Point the camera at the food or packaging.";
  };


  // =====================================
  // BARCODE RESULT
  // =====================================

  const hasBarcode =

    selectedMode === "barcode" &&

    Boolean(barcodeResult?.found);


  // =====================================
  // USER INTERFACE
  // =====================================

  return (

    <main className="scan-page">


      {/* ============================= */}
      {/* TOP BAR */}
      {/* ============================= */}

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


      {/* ============================= */}
      {/* CAMERA AREA */}
      {/* ============================= */}

      <div

        className="scanner-camera"

        style={{
          position: "relative",
        }}
      >


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


        {/* =========================== */}
        {/* LIVE BARCODE LOCALIZATION */}
        {/* =========================== */}

        <LiveBarcodeOverlay

          videoRef={videoRef}

          enabled={

            selectedMode === "barcode" &&

            cameraReady &&

            !cameraError &&

            !capturedImage &&

            !analyzing
          }

          mirrored={
            cameraFacing === "user"
          }

          onDetectionChange={
            setLiveBarcodeDetection
          }
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


        {/* =========================== */}
        {/* PRODUCT RESULT */}
        {/* =========================== */}

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


        {/* =========================== */}
        {/* EXPIRY RESULT */}
        {/* =========================== */}

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


        {/* =========================== */}
        {/* SWITCH CAMERA */}
        {/* =========================== */}

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


        {/* =========================== */}
        {/* CAMERA ERROR */}
        {/* =========================== */}

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


        {/* =========================== */}
        {/* CAMERA LOADING */}
        {/* =========================== */}

        {!cameraReady &&
          !cameraError &&
          !capturedImage && (

            <div className="camera-loading">

              Starting camera...

            </div>

          )}


        {/* =========================== */}
        {/* FIXED FRAME */}
        {/* PRODUCT AND EXPIRY ONLY */}
        {/* =========================== */}

        {!cameraError &&
          selectedMode !== "barcode" && (

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


      {/* ============================= */}
      {/* HIDDEN CANVAS */}
      {/* ============================= */}

      <canvas

        ref={canvasRef}

        style={{
          display: "none",
        }}
      />


      {/* ============================= */}
      {/* BOTTOM CONTROLS */}
      {/* ============================= */}

      <div className="scanner-bottom-panel">


        {/* =========================== */}
        {/* SCANNER MODE SELECTION */}
        {/* =========================== */}

        {!capturedImage && (

          <>

            <AddFoodScanner

              selectedMode={selectedMode}

              onSelectMode={handleModeChange}
            />


            {/* ======================= */}
            {/* INTELLIGENT CAPTURE */}
            {/* ======================= */}

            <button

              className="capture-button"

              onClick={capturePhoto}

              disabled={

                !cameraReady ||

                Boolean(cameraError) ||

                analyzing ||

                (
                  selectedMode === "barcode" &&
                  !barcodeReady
                )
              }

              style={{

                borderColor:

                  selectedMode === "barcode" &&
                  barcodeReady

                    ? "#22c55e"

                    : undefined,


                opacity:

                  selectedMode === "barcode" &&
                  !barcodeReady

                    ? 0.4

                    : 1,


                cursor:

                  selectedMode === "barcode" &&
                  !barcodeReady

                    ? "not-allowed"

                    : undefined,
              }}

              type="button"

              aria-label="Capture image"
            >

              <span

                style={{

                  background:

                    selectedMode === "barcode" &&
                    barcodeReady

                      ? "#22c55e"

                      : undefined,
                }}
              />

            </button>


            <p

              className="scanner-help-text"

              style={{

                color:

                  selectedMode === "barcode" &&
                  barcodeReady

                    ? "#22c55e"

                    : undefined,
              }}
            >

              {getHelpText()}

            </p>

          </>

        )}


        {/* =========================== */}
        {/* PHOTO PREVIEW ACTIONS */}
        {/* =========================== */}

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


        {/* =========================== */}
        {/* ANALYSIS ERROR */}
        {/* =========================== */}

        {analysisError && (

          <p

            className="scanner-help-text"

            role="alert"
          >

            {analysisError}

          </p>

        )}


        {/* =========================== */}
        {/* BARCODE CONFIRMATION */}
        {/* =========================== */}

        {hasBarcode && (

          <BarcodeConfirmation

            key={

              `${barcodeResult.source}-${barcodeResult.barcode}`

            }

            barcodeResult={barcodeResult}

            onScanAgain={handleRetake}
          />

        )}


        {/* =========================== */}
        {/* INTELLIGENT BARCODE DEBUGGER */}
        {/* DEVELOPMENT ONLY */}
        {/* =========================== */}

        {import.meta.env.DEV &&
          selectedMode === "barcode" &&
          capturedImage && (

            <div

              style={{

                padding: "15px",

                margin: "10px",

                background: "#ffffff",

                color: "#111111",

                borderRadius: "12px",
              }}
            >

              <h2>Intelligent Barcode Processing</h2>


              {/* AUTOMATIC CROP */}

              {scanImage && (

                <>

                  <h3>
                    Stage 1 — Automatic Barcode Crop
                  </h3>


                  <img

                    src={scanImage}

                    alt="Automatically cropped barcode"

                    style={{

                      width: "100%",

                      maxWidth: "500px",

                      objectFit: "contain",

                      border: "2px solid green",

                      borderRadius: "8px",
                    }}

                    onLoad={(event) => {

                      console.log(

                        "Automatic crop resolution:",

                        event.currentTarget.naturalWidth,

                        event.currentTarget.naturalHeight
                      );
                    }}
                  />


                  <p>

                    Image size:{" "}

                    {Math.round(

                      (
                        scanImage.split(",")[1]?.length || 0
                      ) * 0.75 / 1024

                    )} KB (approx.)

                  </p>


                  <a

                    href={scanImage}

                    download="barcode-crop.png"
                  >

                    Download Cropped Barcode

                  </a>

                </>

              )}


              {/* OPENCV PROCESSING */}

              {preprocessingLoading && (

                <p>

                  Processing OpenCV barcode region...

                </p>

              )}


              {/* OPENCV DETECTION RESULT */}

              {preprocessingResult?.found && (

                <>

                  <h3>
                    Stage 2 — Detected Region
                  </h3>


                  <img

                    src={
                      preprocessingResult.detectionPreview
                    }

                    alt="Detected barcode region"

                    style={{

                      width: "100%",

                      maxWidth: "600px",
                    }}
                  />


                  <h3>
                    Stage 3 — Corrected Barcode
                  </h3>


                  <img

                    src={
                      preprocessingResult.correctedImage
                    }

                    alt="Corrected barcode"

                    style={{

                      width: "100%",

                      maxWidth: "600px",

                      border: "2px solid green",
                    }}
                  />


                  <p>

                    Resolution:{" "}

                    {preprocessingResult.width}

                    {" × "}

                    {preprocessingResult.height}

                  </p>


                  <p>

                    Processing time:{" "}

                    {preprocessingResult.duration} ms

                  </p>


                  <a

                    href={
                      preprocessingResult.correctedImage
                    }

                    download="corrected-barcode.png"
                  >

                    Download Corrected Barcode

                  </a>

                </>

              )}


              {/* OPENCV FAILURE */}

              {preprocessingResult &&
                !preprocessingResult.found && (

                  <p style={{ color: "#dc2626" }}>

                    {

                      preprocessingResult.reason ||

                      "No barcode region detected"

                    }

                  </p>

                )}

            </div>

          )}

      </div>

    </main>
  );
}

export default ScanFood;
