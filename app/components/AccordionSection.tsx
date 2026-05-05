"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AccordionSection({
  id,
  title,
  icon,
  accentColor = "border-t-4 border-t-blue-500",
  children,
  defaultOpen = false,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = localStorage.getItem(`accordion-${id}`);
    if (saved !== null) {
      setIsOpen(saved === 'true');
    }
  }, [id]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(`accordion-${id}`, next.toString());
  };

  return (
    <div className={`bg-white rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 ${accentColor}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left"
      >
        <h3 className="text-lg md:text-xl font-extrabold text-slate-800 flex items-center gap-2 md:gap-3">
          {icon}
          {title}
        </h3>
        {isOpen ? (
          <ChevronUp size={20} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          {children}
        </div>
      )}
    </div>
  );
}
