import { useState } from "react";

import ExpiryReviewModal from "./ExpiryReviewModal";
import FoodActionModal from "./FoodActionModal";

function ExpiredFoods({
  foods,
  onFoodAction,
}) {
  const [selectedFood, setSelectedFood] =
    useState(null);

  const [selectedAction, setSelectedAction] =
    useState(null);

  const closeEverything = () => {
    setSelectedFood(null);
    setSelectedAction(null);
  };



  if (foods.length === 0) {
    return (
      <section className="expired-section">
        <h2>Expired Foods</h2>

        <p>No expired foods 🎉</p>
      </section>
    );
  }

  return (
    <>
      <section className="expired-section">
        <div className="expired-header">
          <div>
            <h2>Expired Foods</h2>

            <p>
              Foods that have passed their
              expiry date.
            </p>
          </div>

          <strong>
            {foods.length} expired
          </strong>
        </div>

        <div className="expired-table">
          <div className="expired-row expired-table-header">
            <span>Food</span>
            <span>Quantity</span>
            <span>Category</span>
            <span>Expired</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {foods.map((food) => (
            <div
              className="expired-row"
              key={food._id}
            >
              <span>{food.name}</span>

              <span>{food.quantity}</span>

              <span>{food.category}</span>

              <span>
                {Math.abs(
                  food.daysRemaining
                )}{" "}
                days ago
              </span>

              <span className="expired-badge">
                ⚫ Expired
              </span>

              <button
                className="review-food-button"
                onClick={() =>
                  setSelectedFood(food)
                }
              >
                Review
              </button>
            </div>
          ))}
        </div>
      </section>

      {selectedFood &&
        !selectedAction && (
          <ExpiryReviewModal
            food={selectedFood}
            onConsumed={() =>
              setSelectedAction("CONSUMED")
            }
            onWasted={() =>
              setSelectedAction("WASTED")
            }
            onStillHave={closeEverything}
            onClose={closeEverything}
          />
        )}

      {selectedFood &&
        selectedAction && (
          <FoodActionModal
            food={selectedFood}
            action={selectedAction}
            onConfirm={onFoodAction}
            onClose={closeEverything}
            expiredReview={true}
          />
        )}
    </>
  );
}

export default ExpiredFoods;