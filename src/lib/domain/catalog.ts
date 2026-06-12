/** Menu categories and vendor locations — the vocabulary the domain reasons about. */

export const MENU_CATEGORIES = [
  "soda",
  "juice",
  "fruits",
  "chips_yai",
  "chips_kavu",
  "wali_nyama",
  "pilau_nyama",
  "mixer_nyama",
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export type VendorLocation = "in_campus" | "out_campus";

/** Human labels for UI. */
export const CATEGORY_LABEL: Record<MenuCategory, string> = {
  soda: "Soda",
  juice: "Juice",
  fruits: "Fruits",
  chips_yai: "Chips Yai",
  chips_kavu: "Chips Kavu",
  wali_nyama: "Wali Nyama",
  pilau_nyama: "Pilau Nyama",
  mixer_nyama: "Mixer Nyama",
};

/**
 * "Light" instant items a low-deposit courier may carry.
 * Everything else is a "hot meal" requiring the 10,000 TSh deposit tier.
 */
export const LIGHT_CATEGORIES: ReadonlySet<MenuCategory> = new Set([
  "soda",
  "juice",
  "fruits",
]);

export function isHotMeal(category: MenuCategory): boolean {
  return !LIGHT_CATEGORIES.has(category);
}
