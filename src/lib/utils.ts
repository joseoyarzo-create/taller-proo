import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTimeStatus = (fechaIngreso: Date): 'normal' | 'advertencia' | 'atrasado' => {
  const hoy = new Date();
  const diffTime = Math.abs(hoy.getTime() - fechaIngreso.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 7) {
    return 'atrasado';
  }
  if (diffDays >= 5) {
    return 'advertencia';
  }
  return 'normal';
};