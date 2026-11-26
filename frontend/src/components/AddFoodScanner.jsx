function AddFoodScanner({
  selectedMode,
  onSelectMode,
}) {
  const scannerModes = [
    {
      id: "product",
      icon: "📦",
      title: "Product",
      description:
        "Scan a food product and let AI identify it.",
    },
    {
      id: "expiry",
      icon: "📅",
      title: "Expiry",
      description:
        "Scan an expiry or best-before date.",
    },
    {
      id: "barcode",
      icon: "▣",
      title: "Barcode",
      description:
        "Scan a product barcode.",
    },
  ];

  return (
    <div className="scanner-mode-list">
      {scannerModes.map((mode) => (
        <button
          key={mode.id}
          className={
            selectedMode === mode.id
              ? "scanner-mode-card active"
              : "scanner-mode-card"
          }
          onClick={() => onSelectMode(mode.id)}
        >
          <span className="scanner-mode-icon">
            {mode.icon}
          </span>

          <div>
            <h3>{mode.title}</h3>
            <p>{mode.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default AddFoodScanner;