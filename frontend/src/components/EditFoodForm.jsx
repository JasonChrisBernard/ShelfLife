import { useState } from "react";

function EditFoodForm({ food, onUpdateFood, onCancel }) {
  const [formData, setFormData] = useState({
    name: food.name,
    quantity: food.quantity,
    category: food.category,
    storageLocation: food.storageLocation,
    purchaseDate: food.purchaseDate.slice(0, 10),
    expiryDate: food.expiryDate.slice(0, 10),
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onUpdateFood(food._id, {
      ...formData,
      quantity: Number(formData.quantity),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
      />

      <input
        name="quantity"
        type="number"
        value={formData.quantity}
        onChange={handleChange}
      />

      <input
        name="category"
        value={formData.category}
        onChange={handleChange}
      />

      <input
        name="storageLocation"
        value={formData.storageLocation}
        onChange={handleChange}
      />

      <input
        name="purchaseDate"
        type="date"
        value={formData.purchaseDate}
        onChange={handleChange}
      />

      <input
        name="expiryDate"
        type="date"
        value={formData.expiryDate}
        onChange={handleChange}
      />

      <button type="submit">Save</button>

      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

export default EditFoodForm;