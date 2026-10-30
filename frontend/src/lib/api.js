import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

export const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "ps5", label: "PS5" },
  { key: "xbox", label: "Xbox Series" },
  { key: "pc", label: "PC" },
  { key: "switch", label: "Switch" },
];

export const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "TBA";

const PLATFORM_SHORT = [
  ["playstation 5", "PS5"], ["playstation 4", "PS4"], ["xbox series", "XSX"], ["xbox one", "XB1"],
  ["switch", "Switch"], ["ios", "iOS"], ["android", "Android"], ["mac", "Mac"], ["linux", "Linux"],
];

export const platformShort = (name) => {
  const n = name.toLowerCase();
  if (n === "pc") return "PC";
  return PLATFORM_SHORT.find(([match]) => n.includes(match))?.[1] ?? null;
};
