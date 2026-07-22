/**
 * Curated discovery-anchor catalog (DEV-310).
 *
 * The model may only surface discovery suggestions whose `anchorOccasion`
 * is a key from this list; dates are resolved here in code and the
 * validator overwrites whatever date the model returns. Every anchor is a
 * real, verifiable observance. Extend the list as beta feedback warrants —
 * an anchor needs a deterministic date resolver to qualify (which is why
 * e.g. sports opening days are absent until we maintain a season table).
 */

import {
  nextAutumnEquinox,
  nextNthWeekdayOfMonth,
  nextOccurrenceOfMonthDay,
  nextSpringEquinox,
  nextSummerSolstice,
  nextWinterSolstice,
} from "./occasion-dates.ts";

export interface DiscoveryAnchor {
  key: string;
  name: string;
  date: string;
}

export function buildDiscoveryAnchors(): DiscoveryAnchor[] {
  return [
    {
      key: "winter_solstice",
      name: "Winter Solstice",
      date: nextWinterSolstice(),
    },
    {
      key: "summer_solstice",
      name: "Summer Solstice",
      date: nextSummerSolstice(),
    },
    {
      key: "autumn_equinox",
      name: "Autumn Equinox",
      date: nextAutumnEquinox(),
    },
    {
      key: "spring_equinox",
      name: "Spring Equinox",
      date: nextSpringEquinox(),
    },
    // 3rd Saturday of April
    {
      key: "record_store_day",
      name: "Record Store Day",
      date: nextNthWeekdayOfMonth(4, 6, 3),
    },
    // 1st Wednesday of June
    {
      key: "global_running_day",
      name: "Global Running Day",
      date: nextNthWeekdayOfMonth(6, 3, 1),
    },
    {
      key: "earth_day",
      name: "Earth Day",
      date: nextOccurrenceOfMonthDay(4, 22),
    },
    {
      key: "international_coffee_day",
      name: "International Coffee Day",
      date: nextOccurrenceOfMonthDay(10, 1),
    },
    {
      key: "national_dog_day",
      name: "National Dog Day",
      date: nextOccurrenceOfMonthDay(8, 26),
    },
    {
      key: "national_cat_day",
      name: "National Cat Day",
      date: nextOccurrenceOfMonthDay(10, 29),
    },
    {
      key: "book_lovers_day",
      name: "Book Lovers Day",
      date: nextOccurrenceOfMonthDay(8, 9),
    },
    {
      key: "world_photography_day",
      name: "World Photography Day",
      date: nextOccurrenceOfMonthDay(8, 19),
    },
    {
      key: "international_museum_day",
      name: "International Museum Day",
      date: nextOccurrenceOfMonthDay(5, 18),
    },
    {
      key: "international_yoga_day",
      name: "International Day of Yoga",
      date: nextOccurrenceOfMonthDay(6, 21),
    },
    {
      key: "take_a_hike_day",
      name: "National Take a Hike Day",
      date: nextOccurrenceOfMonthDay(11, 17),
    },
    {
      key: "world_art_day",
      name: "World Art Day",
      date: nextOccurrenceOfMonthDay(4, 15),
    },
    {
      key: "national_gardening_day",
      name: "National Gardening Day",
      date: nextOccurrenceOfMonthDay(4, 14),
    },
    {
      key: "world_oceans_day",
      name: "World Oceans Day",
      date: nextOccurrenceOfMonthDay(6, 8),
    },
  ];
}
