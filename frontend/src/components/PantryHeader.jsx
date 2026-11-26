function PantryHeader({ foodCount }) {
  return (
    <div className="pantry-header">
      <div>
        <h1>My Pantry</h1>
        <p>Manage the food you currently have.</p>
      </div>

      <strong>{foodCount} foods</strong>
    </div>
  );
}

export default PantryHeader;