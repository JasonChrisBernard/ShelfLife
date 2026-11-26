import { useEffect, useState } from "react";

import {
  locateBarcodeInVideo,
} from "../services/barcodeLocalizationService";


// =====================================
// CONFIGURATION
// =====================================

const DETECTION_INTERVAL = 250;


// =====================================
// CONVERT CAMERA COORDINATES
// =====================================

const mapPointToScreen = (
  point,
  video,
  mirrored
) => {

  const width = video.clientWidth;
  const height = video.clientHeight;

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const fit = getComputedStyle(video).objectFit;

  const scale =
    fit === "contain"
      ? Math.min(
          width / videoWidth,
          height / videoHeight
        )
      : Math.max(
          width / videoWidth,
          height / videoHeight
        );

  const scaleX =
    fit === "fill"
      ? width / videoWidth
      : scale;

  const scaleY =
    fit === "fill"
      ? height / videoHeight
      : scale;

  const offsetX =
    (width - videoWidth * scaleX) / 2;

  const offsetY =
    (height - videoHeight * scaleY) / 2;

  let x =
    point.x * videoWidth * scaleX +
    offsetX;

  const y =
    point.y * videoHeight * scaleY +
    offsetY;

  if (mirrored) {
    x = width - x;
  }

  return {
    x,
    y,
  };
};


// =====================================
// LIVE BARCODE OVERLAY COMPONENT
// =====================================

function LiveBarcodeOverlay({
  videoRef,
  enabled,
  mirrored = false,
  onDetectionChange,
})  {

  const [detection, setDetection] =
    useState(null);


  // ===================================
  // LIVE LOCALIZATION LOOP
  // ===================================

  useEffect(() => {

  setDetection(null);
  onDetectionChange?.(null);

  if (!enabled) return;

  let cancelled = false;
  let timer;

  const publishDetection = (result) => {

    setDetection(result);

    onDetectionChange?.(result);
  };

  const detect = async () => {

    if (cancelled) return;

    const video = videoRef.current;

    try {

      if (
        video &&
        video.readyState >= 2 &&
        !document.hidden
      ) {

        const result =
          await locateBarcodeInVideo(video);

        if (cancelled) return;

        if (!result.busy) {

          publishDetection(
            result.found ? result : null
          );
        }

      } else {

        publishDetection(null);
      }

    } catch (error) {

      if (cancelled) return;

      console.warn(
        "Live detection failed:",
        error
      );

      publishDetection(null);

    } finally {

      if (!cancelled) {

        timer = setTimeout(
          detect,
          DETECTION_INTERVAL
        );
      }
    }
  };

  detect();

  return () => {

    cancelled = true;

    clearTimeout(timer);

    onDetectionChange?.(null);
  };

}, [
  enabled,
  videoRef,
  mirrored,
  onDetectionChange,
])

  // ===================================
  // CHECK VIDEO AVAILABILITY
  // ===================================

  const video = videoRef.current;

  if (
    !enabled ||
    !video ||
    !video.videoWidth ||
    !video.clientWidth
  ) {
    return null;
  }


  // ===================================
  // DETECTION STATUS
  // ===================================

  const verified =
  detection?.found === true &&
  detection?.verified === true &&
  detection?.boxes?.length === 1;

  const found =
    detection?.found === true;

  const outlineColor =
    verified ? "#22c55e" : "#f59e0b";

  const videoRect =
    video.getBoundingClientRect();

  const parentRect =
    video.parentElement.getBoundingClientRect();


  // ===================================
  // DISPLAY DETECTION OVERLAY
  // ===================================

  return (

    <div
      style={{

        position: "absolute",

        left:
          videoRect.left - parentRect.left,

        top:
          videoRect.top - parentRect.top,

        width: videoRect.width,

        height: videoRect.height,

        pointerEvents: "none",

        overflow: "hidden",

        zIndex: 5,

      }}
    >

      {/* DYNAMIC BARCODE OUTLINES */}

      <svg
        width="100%"
        height="100%"
        viewBox={
          `0 0 ${video.clientWidth} ${video.clientHeight}`
        }
        style={{
          position: "absolute",
          inset: 0,
        }}
      >

        {detection?.boxes?.map((box, index) => {

          const points = box.map((point) =>

            mapPointToScreen(
              point,
              video,
              mirrored
            )
          );

          const polygonPoints =
            points
              .map((point) =>
                `${point.x},${point.y}`
              )
              .join(" ");

          return (

            <polygon

              key={index}

              points={polygonPoints}

              fill={outlineColor}

              fillOpacity={0.08}

              stroke={outlineColor}

              strokeWidth={3}

              strokeLinejoin="round"

              vectorEffect="non-scaling-stroke"

            />
          );
        })}

      </svg>


      {/* BARCODE DETECTION STATUS */}

      <div
        style={{

          position: "absolute",

          bottom: "25px",

          left: "50%",

          transform: "translateX(-50%)",

          background: verified
            ? "rgba(20, 83, 45, 0.9)"
            : "rgba(0, 0, 0, 0.75)",

          color: "#ffffff",

          padding: "10px 18px",

          borderRadius: "30px",

          fontSize: "14px",

          fontWeight: "600",

          whiteSpace: "nowrap",

          textAlign: "center",

        }}
      >

        {verified

          ? "✓ Barcode detected"

          : found

            ? "Barcode located — Hold steady"

            : "Searching for barcode..."}

      </div>

    </div>
  );
}

export default LiveBarcodeOverlay;