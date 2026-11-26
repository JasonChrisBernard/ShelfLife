import { useState } from "react";
import { getFoodAIRecommendation } from "../services/aiService";

function ExpiryReviewModal({
  food,
  onConsumed,
  onWasted,
  onStillHave,
  onClose,
}) {
  const [recommendation, setRecommendation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAskAI = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      setRecommendation("");

      const data = await getFoodAIRecommendation(
        food._id
      );

      setRecommendation(data.recommendation);
    } catch (error) {
      console.error(error);

      setAiError(
        error.message ||
          "ShelfLife AI could not respond."
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="expiry-review-modal"
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="expiry-review-icon">
          ⚠️
        </div>

        <h2>{food.name} has expired</h2>

        <p className="expiry-review-description">
          This item expired{" "}
          <strong>
            {Math.abs(food.daysRemaining)} day
            {Math.abs(food.daysRemaining) !== 1
              ? "s"
              : ""}
          </strong>{" "}
          ago.
        </p>

        <p className="expiry-question">
          What happened to this item?
        </p>

        <div className="expiry-review-actions">
          <button
            className="review-consumed"
            onClick={onConsumed}
            >
            🍽️ Already Consumed
          </button>

          <p className="expiry-action-note">
            “Already Consumed” records that you ate the item previously.
            It does not mean ShelfLife recommends eating expired food now.
          </p>

          <button
            className="review-wasted"
            onClick={onWasted}
          >
            🗑️ Wasted
          </button>

          <button
            className="review-still-have"
            onClick={onStillHave}
          >
            📦 Still Have It
          </button>
        </div>

        <div className="ai-recommendation-box">
          <div className="ai-heading">
            <span>✨</span>

            <div>
              <strong>ShelfLife AI</strong>

              {!recommendation && (
                <p>
                  Not sure what to do with this
                  item? Ask ShelfLife AI.
                </p>
              )}
            </div>
          </div>

          {!recommendation && (
            <button
              className="ask-ai-button"
              onClick={handleAskAI}
              disabled={aiLoading}
            >
              {aiLoading
                ? "Thinking..."
                : "Ask AI"}
            </button>
          )}

          {aiError && (
            <p className="ai-error">
              {aiError}
            </p>
          )}

          {recommendation && (
            <div className="ai-answer">
              <p>{recommendation}</p>

              <button
                onClick={handleAskAI}
                disabled={aiLoading}
              >
                {aiLoading
                  ? "Thinking..."
                  : "Ask Again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpiryReviewModal;