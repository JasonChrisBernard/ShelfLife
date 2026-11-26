// =====================================
// INTELLIGENT BARCODE PREPROCESSING
// =====================================

let openCvPromise = null;


// =====================================
// 1. LOAD OPENCV
// =====================================

const loadOpenCV = () => {

  if (!openCvPromise) {

    openCvPromise = (async () => {

      const module =
        await import("@techstark/opencv-js");

      let cv = module.default;

      if (typeof cv?.then === "function") {

        cv = await cv;

      } else if (!cv?.Mat) {

        await new Promise((resolve) => {

          cv.onRuntimeInitialized = resolve;

        });
      }

      if (
        typeof cv.barcode_BarcodeDetector
          !== "function"
      ) {

        throw new Error(
          "OpenCV barcode detector unavailable"
        );
      }

      console.log("OpenCV barcode detector ready");

      return { cv };

    })().catch((error) => {

      openCvPromise = null;

      throw error;
    });
  }

  return openCvPromise;
};


// =====================================
// 2. PRELOAD OPENCV
// =====================================

export const preloadBarcodePreprocessor =
  async () => {

    await loadOpenCV();
  };


// =====================================
// 3. LOAD CAPTURED IMAGE
// =====================================

const loadImage = (source) => {

  return new Promise((resolve, reject) => {

    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () =>
      reject(new Error("Could not load image"));

    image.src = source;
  });
};


// =====================================
// 4. DISTANCE BETWEEN TWO POINTS
// =====================================

const distance = (a, b) => {

  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
};


// =====================================
// 5. AUTOMATIC BARCODE PREPROCESSING
// =====================================

export const preprocessBarcodeImage =
  async (imageSource) => {

    const startTime = performance.now();

    const { cv } = await loadOpenCV();

    const resources = [];

    const track = (resource) => {

      resources.push(resource);

      return resource;
    };

    try {

      // LOAD ORIGINAL PHOTO

      const image = await loadImage(imageSource);

      const canvas =
        document.createElement("canvas");

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      context.drawImage(image, 0, 0);


      // CONVERT IMAGE TO OPENCV MATRIX

      const original = track(
        cv.imread(canvas)
      );

      const gray = track(new cv.Mat());

      cv.cvtColor(
        original,
        gray,
        cv.COLOR_RGBA2GRAY
      );


      // =================================
      // AUTOMATIC REGION DETECTION
      // =================================

      const detector = track(
        new cv.barcode_BarcodeDetector()
      );

      const points = track(new cv.Mat());

      const detected = detector.detect(
        gray,
        points
      );

      const coordinates =
        Array.from(points.data32F);

      if (
        !detected ||
        coordinates.length < 8 ||
        coordinates.length % 8 !== 0 ||
        !coordinates.every(Number.isFinite)
      ) {

        return {
          found: false,
          reason: "No barcode region detected",
          duration: Math.round(
            performance.now() - startTime
          ),
        };
      }


      // MULTIPLE BARCODE PROTECTION

      const regionCount =
        coordinates.length / 8;

      if (regionCount !== 1) {

        return {
          found: false,
          regionCount,
          reason: "Multiple barcode regions detected",
          duration: Math.round(
            performance.now() - startTime
          ),
        };
      }


      // =================================
      // EXTRACT FOUR CORNERS
      // =================================

      const corners = [];

      for (let i = 0; i < 8; i += 2) {

        corners.push({
          x: coordinates[i],
          y: coordinates[i + 1],
        });
      }

      // OPENCV BARCODE CORNER ORDER
      // Bottom-left, top-left,
      // top-right, bottom-right

      const [
        bottomLeft,
        topLeft,
        topRight,
        bottomRight,
      ] = corners;


      // =================================
      // CALCULATE BARCODE DIMENSIONS
      // =================================

      const width = Math.round(

        Math.max(
          distance(topLeft, topRight),
          distance(bottomLeft, bottomRight)
        )
      );

      const height = Math.round(

        Math.max(
          distance(topLeft, bottomLeft),
          distance(topRight, bottomRight)
        )
      );

      if (width < 20 || height < 10) {

        return {
          found: false,
          reason: "Barcode region too small",
        };
      }


      // =================================
      // INTELLIGENT PADDING
      // =================================

      const paddingX = Math.max(
        12,
        Math.round(width * 0.15)
      );

      const paddingY = Math.max(
        12,
        Math.round(height * 0.25)
      );

      const outputWidth =
        width + paddingX * 2;

      const outputHeight =
        height + paddingY * 2;


      // =================================
      // PERSPECTIVE CORRECTION
      // =================================

      const sourcePoints = track(
        cv.matFromArray(
          4,
          1,
          cv.CV_32FC2,
          [
            topLeft.x, topLeft.y,
            topRight.x, topRight.y,
            bottomRight.x, bottomRight.y,
            bottomLeft.x, bottomLeft.y,
          ]
        )
      );

      const destinationPoints = track(
        cv.matFromArray(
          4,
          1,
          cv.CV_32FC2,
          [
            paddingX,
            paddingY,

            paddingX + width - 1,
            paddingY,

            paddingX + width - 1,
            paddingY + height - 1,

            paddingX,
            paddingY + height - 1,
          ]
        )
      );

      const transform = track(
        cv.getPerspectiveTransform(
          sourcePoints,
          destinationPoints
        )
      );

      const corrected = track(new cv.Mat());

      cv.warpPerspective(
        original,
        corrected,
        transform,
        new cv.Size(
          outputWidth,
          outputHeight
        ),
        cv.INTER_LINEAR,
        cv.BORDER_CONSTANT,
        new cv.Scalar(255, 255, 255, 255)
      );


      // =================================
      // EXPORT CORRECTED IMAGE
      // =================================

      const outputCanvas =
        document.createElement("canvas");

      cv.imshow(outputCanvas, corrected);

      const correctedImage =
        outputCanvas.toDataURL("image/png");


      // =================================
      // DRAW DETECTION BOUNDARIES
      // DEBUGGING PURPOSES
      // =================================

      context.strokeStyle = "#00ff00";
      context.lineWidth = 5;

      context.beginPath();

      context.moveTo(
        corners[0].x,
        corners[0].y
      );

      corners.slice(1).forEach((point) => {

        context.lineTo(point.x, point.y);
      });

      context.closePath();
      context.stroke();

      const detectionPreview =
        canvas.toDataURL("image/jpeg", 0.85);


      // =================================
      // RETURN RESULTS
      // =================================

      const duration = Math.round(
        performance.now() - startTime
      );

      console.log(
        "Automatic barcode region detected:",
        corners
      );

      console.log(
        "Corrected image resolution:",
        outputWidth,
        outputHeight
      );

      console.log(
        "Barcode preprocessing duration:",
        duration,
        "ms"
      );

      return {

        found: true,

        source: "opencv",

        regionCount,

        corners,

        correctedImage,

        detectionPreview,

        width: outputWidth,

        height: outputHeight,

        duration,
      };

    } finally {

      // RELEASE OPENCV MEMORY

      resources.reverse().forEach(
        (resource) => resource.delete()
      );
    }
  };