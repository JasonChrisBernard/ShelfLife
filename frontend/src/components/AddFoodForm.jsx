import { useState } from "react";

function AddFoodForm({ onAddFood }) {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    category: "",
    storageLocation: "",
    purchaseDate: "",
    expiryDate: "",
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onAddFood({
      ...formData,
      quantity: Number(formData.quantity),
    });

    setFormData({
      name: "",
      quantity: "",
      category: "",
      storageLocation: "",
      purchaseDate: "",
      expiryDate: "",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Food</h2>

      <input
        name="name"
        placeholder="Food name"
        value={formData.name}
        onChange={handleChange}
        required
      />

      <input
        name="quantity"
        type="number"
        placeholder="Quantity"
        value={formData.quantity}
        onChange={handleChange}
        required
      />

      <input
        name="category"
        placeholder="Category"
        value={formData.category}
        onChange={handleChange}
        required
      />

      <input
        name="storageLocation"
        placeholder="Storage location"
        value={formData.storageLocation}
        onChange={handleChange}
        required
      />

      <input
        name="purchaseDate"
        type="date"
        value={formData.purchaseDate}
        onChange={handleChange}
        required
      />

      <input
        name="expiryDate"
        type="date"
        value={formData.expiryDate}
        onChange={handleChange}
        required
      />

      <button type="submit">Add Food</button>
    </form>
  );
}

export default AddFoodForm;