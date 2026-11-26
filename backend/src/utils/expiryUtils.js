export const getExpiryInfo = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const daysRemaining = Math.round(
    (expiry - today) / millisecondsPerDay
  );

  let expiryStatus;

  if (daysRemaining < 0) {
    expiryStatus = "Expired";
  } else if (daysRemaining <= 3) {
    expiryStatus = "Use Soon";
  } else if (daysRemaining <= 7) {
    expiryStatus = "Expiring Soon";
  } else if (daysRemaining <= 14) {
    expiryStatus = "Watch";
  } else {
    expiryStatus = "Safe";
  }

  return {
    daysRemaining,
    expiryStatus,
  };
};