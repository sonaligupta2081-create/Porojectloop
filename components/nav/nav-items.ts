import { LayoutDashboard, Inbox, TrendingUp, MessagesSquare, FileText, Settings } from "lucide-react";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/ask", label: "Ask LOOP", icon: MessagesSquare },
  { href: "/reports", label: "Reports", icon: FileText },
];

export const SECONDARY_NAV = [{ href: "/settings", label: "Settings", icon: Settings }];
