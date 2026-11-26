import { useState } from "react";

function FoodActionModal({
  food,
  action,
  onClose,
  onConfirm,
  expiredReview = false,

}) {
  const [quantity, setQuantity] = useState(1);
  const [wasteReason, setWasteReason] = useState("");
  const [loading, setLoading] = useState(false);

  const wasteReasons = [
    "Expired",
    "Spoiled",
    "Forgot",
    "Too Much",
    "Other",
  ];

  const isWasted = action === "WASTED";

  const increaseQuantity = () => {
    if (quantity < food.quantity) {
      setQuantity((previous) => previous + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((previous) => previous - 1);
    }
  };

  const handleSubmit = async () => {
    if (isWasted && !wasteReason) {
      return;
    }

    try {
      setLoading(true);

      await onConfirm(food._id, {
        action,
        quantity,
        ...(isWasted && {
          wasteReason,
        }),
      });

      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="food-action-modal"
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="modal-icon">
          {isWasted ? "🗑️" : "🍽️"}
        </div>

        <h2>
        {isWasted
            ? `Mark ${food.name} as Wasted`
            : expiredReview
            ? `Record ${food.name} as Already Consumed`
            : `Mark ${food.name} as Consumed`}
        </h2>

        <p className="modal-current-quantity">
          Current quantity: {food.quantity}
        </p>

        <div className="quantity-section">
          <label>Quantity</label>

          <div className="quantity-control">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
            >
              −
            </button>

            <strong>{quantity}</strong>

            <button
              type="button"
              onClick={increaseQuantity}
              disabled={quantity >= food.quantity}
            >
              +
            </button>
          </div>
        </div>

        {isWasted && (
          <div className="waste-reason-section">
            <p>Why was it wasted?</p>

            <div className="waste-reasons">
              {wasteReasons.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  className={
                    wasteReason === reason
                      ? "waste-reason selected"
                      : "waste-reason"
                  }
                  onClick={() =>
                    setWasteReason(reason)
                  }
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            className="modal-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="modal-confirm"
            onClick={handleSubmit}
            disabled={
              loading ||
              (isWasted && !wasteReason)
            }
          >
            {loading
                ? "Saving..."
                : isWasted
                ? "Mark Wasted"
                : expiredReview
                ? "Record as Consumed"
                : "Mark Consumed"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodActionModal;