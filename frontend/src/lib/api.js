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

export const platformShort = (name) => {
  const n = name.toLowerCase();
  if (n.includes("playstation 5")) return "PS5";
  if (n.includes("playstation 4")) return "PS4";
  if (n.includes("xbox series")) return "XSX";
  if (n.includes("xbox one")) return "XB1";
  if (n === "pc") return "PC";
  if (n.includes("switch")) return "Switch";
  if (n.includes("ios")) return "iOS";
  if (n.includes("android")) return "Android";
  if (n.includes("mac")) return "Mac";
  if (n.includes("linux")) return "Linux";
  return null;
};
