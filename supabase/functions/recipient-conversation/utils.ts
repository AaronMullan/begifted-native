// Helper function to clean and parse JSON from OpenAI responses
export function parseOpenAIJSON(content: string): any {
  console.log("Raw OpenAI content:", content);
  // Remove markdown code block formatting if present
  let cleanContent = content.trim();
  if (cleanContent.startsWith("")) {
    cleanContent = cleanContent.replace(/^on\s*/, "").replace(/\s*```$/, "");
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  console.log("Cleaned content for parsing:", cleanContent);
  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("JSON parse error after cleaning:", error);
    console.error("Content that failed to parse:", cleanContent);
    throw error;
  }
}
// Helper function to get next occurrence of a date
export function getNextOccurrenceDate(month: number, day: number): string {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Create date for this year (normalized to midnight)
  const dateForThisYear = new Date(currentYear, month - 1, day);
  const todayNormalized = new Date(
    currentYear,
    currentDate.getMonth(),
    currentDate.getDate()
  );

  // If the date has already passed this year, use next year
  let targetYear = currentYear;
  if (dateForThisYear < todayNormalized) {
    targetYear = currentYear + 1;
  }

  const nextDate = new Date(targetYear, month - 1, day);
  return nextDate.toISOString().split("T")[0];
}

// Helper function to convert holiday names to occasions with dates
// This is a FALLBACK lookup for common holidays when dates aren't provided in conversation
export function convertHolidaysToOccasions(
  holidayNames: string[]
): Array<{ date: string; occasion_type: string }> {
  const holidayDateMap: Record<string, { month: number; day: number }> = {
    christmas: { month: 12, day: 25 },
    "christmas day": { month: 12, day: 25 },
    easter: { month: 4, day: 9 }, // Approximate - Easter is variable, using 2024 date as example
    "valentine's day": { month: 2, day: 14 },
    "valentines day": { month: 2, day: 14 },
    "mother's day": { month: 5, day: 12 }, // Approximate - varies by country
    "mothers day": { month: 5, day: 12 },
    "father's day": { month: 6, day: 16 }, // Approximate - varies by country
    "fathers day": { month: 6, day: 16 },
    "groundhog day": { month: 2, day: 2 },
    "new year's day": { month: 1, day: 1 },
    "new years day": { month: 1, day: 1 },
    "new year's": { month: 1, day: 1 },
    "new years": { month: 1, day: 1 },
    "independence day": { month: 7, day: 4 },
    thanksgiving: { month: 11, day: 28 }, // Approximate - 4th Thursday
    halloween: { month: 10, day: 31 },
    "autumn equinox": { month: 9, day: 22 }, // Approximate - varies by year
    "fall equinox": { month: 9, day: 22 },
    "spring equinox": { month: 3, day: 20 }, // Approximate - varies by year
    "vernal equinox": { month: 3, day: 20 },
    "winter solstice": { month: 12, day: 21 }, // Approximate - varies by year
    "summer solstice": { month: 6, day: 21 }, // Approximate - varies by year
  };

  const occasions: Array<{ date: string; occasion_type: string }> = [];

  for (const holiday of holidayNames) {
    const normalized = holiday.toLowerCase().trim();
    const dateInfo = holidayDateMap[normalized];

    if (dateInfo) {
      const nextDate = getNextOccurrenceDate(dateInfo.month, dateInfo.day);
      occasions.push({
        date: nextDate,
        occasion_type: normalized.replace(/'/g, "").replace(/\s+/g, "_"), // e.g., "valentines_day"
      });
    }
    // If not found, return empty - caller will handle unknown holidays with placeholder dates
  }

  return occasions;
}
