export const BRANCHES = ["Gil Puyat, Pasay", "Sta. Ana", "Angeles"];

export const DENTISTS_BY_BRANCH = {
  "Gil Puyat, Pasay": [
    "Auto-assigned",
    "Queenie Balmedina DMD",
    "Therese Madrid DMD",
    "Vicente Epres II DMD",
    "Carl Adrian Usi DMD",
  ],
  "Sta. Ana": [
    "Auto-assigned",
    "Queenie Balmedina DMD",
    "Vicente Epres II DMD",
    "Carl Adrian Usi DMD",
  ],
  Angeles: [
    "Auto-assigned",
    "Paulette Malit DMD",
  ],
};

export const SERVICE_CATEGORIES = {
  "General Dentistry": [
    { name: "Oral Prophylaxis", duration: 30, price: "Starts ₱500" },
    { name: "Restoration", duration: 60, price: "Starts ₱500" },
    { name: "Extraction", duration: 60, price: "Starts ₱700" },
  ],
  "Orthodontics (Braces, Veneers)": [
    { name: "Orthodontics Installation", duration: 60, price: "₱4,000 DP" },
    { name: "Orthodontics Adjustment", duration: 30, price: "₱1,000" },
    { name: "Veneers / Esthetics", duration: 120, price: "Starts ₱3,500" },
  ],
  "Restorative Treatments": [
    { name: "Root Canal Treatment", duration: 120, price: "Case to Case" },
    { name: "Wisdom Tooth Surgery", duration: 180, price: "Case to Case" },
    { name: "Dentures", duration: 30, price: "Case to Case" },
    { name: "Fixed Bridge", duration: 120, price: "Starts ₱3,500" },
    { name: "Whitening", duration: 90, price: "Case to Case" },
  ],
};
