"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScheduleRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings'); }, []);
  return <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center text-slate-400 text-sm">Перенаправление в настройки...</div>;
}
