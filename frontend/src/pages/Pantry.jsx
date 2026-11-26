import { useEffect, useState } from "react";

import PantryHeader from "../components/PantryHeader";
import AddFoodForm from "../components/AddFoodForm";
import FoodList from "../components/FoodList";
import ExpiredFoods from "../components/ExpiredFoods";
import StatusFilter from "../components/StatusFilter";

import {
  getFoods,
  createFood,
  deleteFood,
  updateFood,
  getExpiredFoods,
  markFoodAction,
} from "../services/foodService";

function Pantry() {
  const [foods, setFoods] = useState([]);
  const [expiredFoods, setExpiredFoods] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("All");

  // =========================
  // LOAD ALL PANTRY DATA
  // =========================

  const loadFoods = async () => {
    try {
      setLoading(true);
      setError("");

      const [activeFoods, expired] = await Promise.all([
        getFoods(),
        getExpiredFoods(),
      ]);

      setFoods(activeFoods);
      setExpiredFoods(expired);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD WHEN PAGE OPENS
  // =========================

  useEffect(() => {
    loadFoods();
  }, []);

  // =========================
  // ADD FOOD
  // =========================

  const handleAddFood = async (foodData) => {
    try {
      await createFood(foodData);

      // Automatically get fresh data
      await loadFoods();
    } catch (error) {
      console.error(error);
      setError("Failed to add food.");
    }
  };

  // =========================
  // DELETE FOOD
  // =========================

  
  const handleDeleteFood = async (id) => {
  try {
    await deleteFood(id);

    // Remove immediately from the screen
    setFoods((previousFoods) =>
      previousFoods.filter(
        (food) => food._id !== id
      )
    );

    // Then sync everything again with backend
    await loadFoods();

  } catch (error) {
    console.error(error);
    setError("Failed to delete food.");
  }
};

  // =========================
  // UPDATE FOOD
  // =========================

  const handleUpdateFood = async (id, foodData) => {
    try {
      await updateFood(id, foodData);

      // Automatically get fresh data
      await loadFoods();
    } catch (error) {
      console.error(error);
      setError("Failed to update food.");
    }
  };


  // =========================
  // STATUS FILTER
  // =========================

  const filteredFoods =
    selectedStatus === "All"
      ? foods
      : foods.filter(
          (food) =>
            food.expiryStatus === selectedStatus
        );

  const handleFoodAction = async (
    id,
    actionData
  ) => {
    try {
      setError("");

      await markFoodAction(id, actionData);

      await loadFoods();
    } catch (error) {
      console.error(error);

      setError(
        error.message || "Failed to update food."
      );
    }
  };

  return (
    <main className="app">
      <PantryHeader foodCount={foods.length} />

      <section className="add-food-section">
        <AddFoodForm
          onAddFood={handleAddFood}
        />
      </section>

      <section className="pantry-section">

        {loading && <p>Loading foods...</p>}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <StatusFilter
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {!loading &&
          !error &&
          filteredFoods.length > 0 && (
            <FoodList
              foods={filteredFoods}
              onDeleteFood={handleDeleteFood}
              onUpdateFood={handleUpdateFood}
              onFoodAction={handleFoodAction}

            />
          )}

        {!loading &&
          !error &&
          foods.length > 0 &&
          filteredFoods.length === 0 && (
            <p>
              No foods with "{selectedStatus}" status.
            </p>
          )}

        {!loading &&
          !error &&
          foods.length === 0 && (
            <p>Your pantry is empty.</p>
          )}

        {selectedStatus === "All" && (
          <ExpiredFoods
            foods={expiredFoods}
            onFoodAction={handleFoodAction}
          />
        )}

      </section>
    </main>
  );
}

export default Pantry;