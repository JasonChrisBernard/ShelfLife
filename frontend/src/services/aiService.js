export const getFoodAIRecommendation = async (id) => {
  const response = await fetch(
    `/api/ai/food/${id}/recommendation`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to get AI recommendation"
    );
  }

  return data;
};

export const chatWithShelfLife = async (message) => {
  const response = await fetch(
    `/api/ai/chat`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        message,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "ShelfLife AI could not respond"
    );
  }

  return data;
};