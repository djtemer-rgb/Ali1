"use client";

import { Trophy, BookOpen, Calendar, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  isLittleHero: boolean;
}

export default function Navigation({ isLittleHero }: NavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Главная", icon: Trophy, hideForLittle: false },
    { href: "/grades", label: "Оценки", icon: BookOpen, hideForLittle: true },
    { href: "/schedule", label: "Расписание", icon: Calendar, hideForLittle: false },
    { href: "/settings", label: "Настройки", icon: Settings, hideForLittle: false },
  ];

  return (
    <nav className="flex gap-2 md:gap-3 px-4 md:px-6 py-4 md:py-6 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
      {navItems.map((item) => {
        if (item.hideForLittle && isLittleHero) return null;
        
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm transition-colors ${
              isActive
                ? "bg-[#3B82F6] text-white shadow-md shadow-blue-200 hover:bg-blue-600"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
