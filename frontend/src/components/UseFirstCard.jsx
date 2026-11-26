function UseFirstCard({ food, position }) {
  const getStatusEmoji = (status) => {
    if (status === "Safe") return "🟢";
    if (status === "Watch") return "🟡";
    if (status === "Expiring Soon") return "🟠";
    if (status === "Use Soon") return "🔴";
    if (status === "Expired") return "⚫";

    return "⚪";
  };

  return (
    <div className="food-card">
      <strong>#{position}</strong>

      <h3>{food.name}</h3>

      <p>Quantity: {food.quantity}</p>
      <p>Storage: {food.storageLocation}</p>

      <p>
        Expiry:{" "}
        {new Date(food.expiryDate).toLocaleDateString()}
      </p>

      <p>
        Days remaining: {food.daysRemaining}
      </p>

      <p className="expiry-status">
        {getStatusEmoji(food.expiryStatus)}{" "}
        {food.expiryStatus}
      </p>
    </div>
  );
}

export default UseFirstCard;