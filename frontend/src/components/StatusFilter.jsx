function StatusFilter({ selectedStatus, onStatusChange }) {
  const statuses = [
    "All",
    "Safe",
    "Watch",
    "Expiring Soon",
    "Use Soon",
  ];

  return (
    <div className="status-filters">
      {statuses.map((status) => (
        <button
          key={status}
          className={
            selectedStatus === status
              ? "filter-button active-filter"
              : "filter-button"
          }
          onClick={() => onStatusChange(status)}
        >
          {status}
        </button>
      ))}
    </div>
  );
}

export default StatusFilter;