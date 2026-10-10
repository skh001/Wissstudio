import {
  CalendarCheck2, CalendarDays, CalendarHeart, Camera, FileBarChart, Home, Package, Scissors, Settings, Star, Users, Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; group: "studio" | "business" | "account" }

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "studio" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "studio" },
  { href: "/appointments", label: "Appointments", icon: CalendarHeart, group: "studio" },
  { href: "/booking", label: "Booking", icon: CalendarCheck2, group: "studio" },
  { href: "/clients", label: "Clients", icon: Users, group: "studio" },
  { href: "/gallery", label: "Gallery", icon: Camera, group: "studio" },
  { href: "/finance", label: "Finance", icon: Wallet, group: "business" },
  { href: "/stock", label: "Stock", icon: Package, group: "business" },
  { href: "/services", label: "Services", icon: Scissors, group: "business" },
  { href: "/reviews", label: "Reviews", icon: Star, group: "business" },
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "business" },
  { href: "/settings", label: "Settings", icon: Settings, group: "account" },
];

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
