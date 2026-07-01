"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Target, Star, Settings } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home", icon: Home, label: "ホーム" },
  { href: "/calendar", icon: Calendar, label: "カレンダー" },
  { href: "/goals", icon: Target, label: "ゴール" },
  { href: "/roles", icon: Star, label: "Role" },
  { href: "/settings", icon: Settings, label: "設定" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-1.5 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-sage/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  isActive ? "text-sage" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] relative z-10 transition-colors ${
                  isActive ? "text-sage font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
