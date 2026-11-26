// =====================================
// BARCODE CHECKSUM VALIDATION
// =====================================

export const isValidGTIN = (barcode) => {

  if (
    typeof barcode !== "string" ||
    !/^\d+$/.test(barcode) ||
    ![8, 12, 13, 14].includes(barcode.length)
  ) {
    return false;
  }

  let sum = 0;
  let multiplier = 3;

  for (
    let i = barcode.length - 2;
    i >= 0;
    i--
  ) {

    sum += Number(barcode[i]) * multiplier;

    multiplier =
      multiplier === 3 ? 1 : 3;
  }

  const expectedCheckDigit =
    (10 - (sum % 10)) % 10;

  return (
    expectedCheckDigit ===
    Number(barcode[barcode.length - 1])
  );
};