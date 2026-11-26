import { useEffect, useState } from "react";

import UseFirstCard from "../components/UseFirstCard";
import { getUseFirstFoods } from "../services/foodService";

function UseFirst() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFoods = async () => {
      try {
        const data = await getUseFirstFoods();

        setFoods(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadFoods();
  }, []);

  return (
    <main className="app">
      <h1>⏱️ Use First</h1>

      <p>
        Foods closest to expiry are shown first.
      </p>

      {loading && <p>Loading foods...</p>}

      {error && <p className="error">{error}</p>}

      {!loading && !error && foods.length === 0 && (
        <p>No foods in your pantry.</p>
      )}

      <div className="food-list">
        {foods.map((food, index) => (
          <UseFirstCard
            key={food._id}
            food={food}
            position={index + 1}
          />
        ))}
      </div>
    </main>
  );
}

export default UseFirst;