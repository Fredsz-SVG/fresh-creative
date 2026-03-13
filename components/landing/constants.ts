import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";

export const NAV_ITEMS = [
  { label: "Fitur", href: "#features" },
  { label: "Demo AR", href: "#demo-ar" },
  { label: "Harga", href: "#pricing" },
] as const;

export const LINKS = {
  sourceCode: "https://github.com/sanidhyy/game-website",
} as const;

export const SOCIAL_LINKS = [
  { href: "https://instagram.com", icon: FaInstagram },
  { href: "https://tiktok.com", icon: FaTiktok },
] as const;

export const VIDEO_LINKS = {
  feature1: "/videos/feature-1.mp4",
  feature2: "/videos/feature-2.mp4",
  feature3: "/videos/hero-day.mp4",
  feature4: "/videos/hero-night.mp4",
  feature5: "/videos/feature-3.mp4",
  hero1: "/videos/hero-day.mp4",
  hero2: "/videos/hero-night.mp4",
} as const;

// Musik landing diambil dari folder public/audio via GET /api/audio (tanpa ubah code)
