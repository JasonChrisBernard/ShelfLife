// ==========================================
// SHELFLIFE FOOD API
// ==========================================

const API_URL =
  `/api/foods`;


// ==========================================
// GET ALL FOODS
// ==========================================

export const getFoods = async () => {
  const response = await fetch(
    API_URL,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load foods"
    );
  }

  return data;
};


// ==========================================
// CREATE FOOD
// ==========================================

export const createFood = async (
  foodData
) => {
  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify(foodData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to create food"
    );
  }

  return data;
};


// ==========================================
// DELETE FOOD
// ==========================================

export const deleteFood = async (
  id
) => {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "DELETE",

      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to delete food"
    );
  }

  return data;
};


// ==========================================
// UPDATE FOOD
// ==========================================

export const updateFood = async (
  id,
  foodData
) => {
  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify(foodData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to update food"
    );
  }

  return data;
};


// ==========================================
// GET USE FIRST FOODS
// ==========================================

export const getUseFirstFoods =
  async () => {
    const response = await fetch(
      `${API_URL}/use-first`,
      {
        credentials: "include",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to load Use First foods"
      );
    }

    return data;
  };


// ==========================================
// GET EXPIRED FOODS
// ==========================================

export const getExpiredFoods =
  async () => {
    const response = await fetch(
      `${API_URL}/expired`,
      {
        credentials: "include",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to load expired foods"
      );
    }

    return data;
  };


// ==========================================
// MARK CONSUMED / WASTED
// ==========================================

export const markFoodAction =
  async (
    id,
    actionData
  ) => {
    const response = await fetch(
      `${API_URL}/${id}/action`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials: "include",

        body:
          JSON.stringify(
            actionData
          ),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to update food action"
      );
    }

    return data;
  };
