import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";

export const NAV_ITEMS = [
  { label: "Fitur", href: "#features" },
  { label: "Harga", href: "#pricing" },
  { label: "E-Book", href: "#demo-ebook" },
] as const;

export const LINKS = {
  sourceCode: "https://github.com/sanidhyy/game-website",
} as const;

export const SOCIAL_LINKS = [
  { href: "https://instagram.com", icon: FaInstagram },
  { href: "https://tiktok.com", icon: FaTiktok },
] as const;

export const VIDEO_LINKS = {
  hero1: "/videos/SIANG.mp4",
  hero2: "/videos/MALAM.mp4",
} as const;

// Musik landing diambil dari folder public/audio via GET /api/audio (tanpa ubah code)
