/**
 * Date utility functions for formatting and calculating dates
 */

export interface Occasion {
  id: string;
  occasion_type: string;
  custom_occasion?: string | null;
  date: string;
  is_annual?: boolean;
}

/**
 * Format birthday for display (e.g., "Jan 15, 1990")
 */
export function formatBirthday(birthday: string | null | undefined): string {
  if (!birthday) return "";
  
  // Handle MM-DD format
  if (birthday.includes("-") && birthday.split("-").length === 2) {
    const [month, day] = birthday.split("-");
    const currentYear = new Date().getFullYear();
    const date = new Date(parseInt(currentYear.toString()), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  
  const date = new Date(birthday);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format occasion date for display (e.g., "Dec 25, 2024")
 */
export function formatOccasionDate(dateString: string): string {
  if (!dateString || dateString.includes("01-01")) {
    return "Date TBD";
  }
  
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format occasion type for display
 */
export function formatOccasionType(type: string, customOccasion?: string | null): string {
  if (type === "birthday") return "Birthday";
  if (type === "custom" && customOccasion) return customOccasion;
  
  // Format other occasion types (e.g., "kwanzaa" -> "Kwanzaa")
  const formatted = type.charAt(0).toUpperCase() + type.slice(1);
  return formatted.replace(/_/g, " ");
}

/**
 * Format occasion for display (e.g., "Birthday - Dec 25, 2024" or "Christmas - Dec 25, 2024")
 */
export function formatOccasionDisplay(occasion: Occasion): string {
  const type = formatOccasionType(occasion.occasion_type, occasion.custom_occasion);
  const date = formatOccasionDate(occasion.date);
  return `${type} - ${date}`;
}

/**
 * Get the next upcoming occasion from an array of occasions
 */
export function getNextOccasion(occasions?: Occasion[]): Occasion | null {
  if (!occasions || occasions.length === 0) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter out occasions with invalid dates and sort by date
  const validOccasions = occasions
    .filter((occ) => {
      if (!occ.date || occ.date.includes("01-01")) return false;
      const date = new Date(occ.date);
      return !isNaN(date.getTime());
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  
  if (validOccasions.length === 0) return null;
  
  // Find the next occasion (date >= today)
  const nextOccasion = validOccasions.find((occ) => {
    const date = new Date(occ.date);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  });
  
  // If no future occasion found, return the first one (next year)
  return nextOccasion || validOccasions[0] || null;
}

