import { useState } from "react";
import EditFoodForm from "./EditFoodForm";
import FoodActionModal from "./FoodActionModal";

function FoodCard({
  food,
  onDeleteFood,
  onUpdateFood,
  onFoodAction,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [actionModal, setActionModal] =
    useState(null);

  const getStatusEmoji = (status) => {
    if (status === "Safe") return "🟢";
    if (status === "Watch") return "🟡";
    if (status === "Expiring Soon") return "🟠";
    if (status === "Use Soon") return "🔴";
    if (status === "Expired") return "⚫";

    return "⚪";
  };

  const handleUpdate = async (
    id,
    updatedFood
  ) => {
    await onUpdateFood(id, updatedFood);

    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="food-card">
        <EditFoodForm
          food={food}
          onUpdateFood={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="food-card">
        <h3>{food.name}</h3>

        <p>Quantity: {food.quantity}</p>

        <p>
          Category: {food.category}
        </p>

        <p>
          Storage: {food.storageLocation}
        </p>

        <p>
          Expiry:{" "}
          {new Date(
            food.expiryDate
          ).toLocaleDateString()}
        </p>

        <p>
          Days remaining: {food.daysRemaining}
        </p>

        <p className="expiry-status">
          {getStatusEmoji(food.expiryStatus)}{" "}
          {food.expiryStatus}
        </p>

        <div className="food-actions">
          <button
            onClick={() =>
              setIsEditing(true)
            }
          >
            Edit
          </button>

          <button
            onClick={() =>
              onDeleteFood(food._id)
            }
          >
            Delete
          </button>
        </div>

        <div className="food-action-buttons">
          <button
            className="consume-button"
            onClick={() =>
              setActionModal("CONSUMED")
            }
          >
            🍽️ Consumed
          </button>

          <button
            className="waste-button"
            onClick={() =>
              setActionModal("WASTED")
            }
          >
            🗑️ Wasted
          </button>
        </div>
      </div>

      {actionModal && (
        <FoodActionModal
          food={food}
          action={actionModal}
          onConfirm={onFoodAction}
          onClose={() =>
            setActionModal(null)
          }
        />
      )}
    </>
  );
}

export default FoodCard;