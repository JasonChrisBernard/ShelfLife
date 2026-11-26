import FoodCard from "./FoodCard";

function FoodList({
  foods,
  onDeleteFood,
  onUpdateFood,
  onFoodAction,
}) {
  return (
    <div className="food-list">
      {foods.map((food) => (
        <FoodCard
          key={food._id}
          food={food}
          onDeleteFood={onDeleteFood}
          onUpdateFood={onUpdateFood}
          onFoodAction={onFoodAction}
        />
      ))}
    </div>
  );
}

export default FoodList;