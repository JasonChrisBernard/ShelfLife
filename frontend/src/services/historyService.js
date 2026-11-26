export const getFoodHistory = async () => {
  const response = await fetch(
    `/api/history`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to load food history"
    );
  }

  return data;
};