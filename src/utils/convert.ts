export const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 100) / 100;
export const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 100) / 100;
export const heightToCm = (feet: number, inches: number): number => Math.round(((feet * 12) + inches) * 2.54);
export const cmToHeight = (cm: number): { feet: number; inches: number } => {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
};
export const calculateBMI = (kg: number, cm: number): number => {
  if (cm <= 0) return 0;
  return Math.round((kg / Math.pow(cm / 100, 2)) * 100) / 100;
};
