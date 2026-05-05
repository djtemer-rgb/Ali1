"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ChildState {
  id: "ali" | "said";
  name: string;
  letter: string;
  mode: "full" | "little-hero";
  avatarUrl?: string;
}

interface ChildContextType {
  currentChild: ChildState;
  switchChild: (id?: "ali" | "said") => void;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

const DEFAULT_CHILDREN: Record<"ali" | "said", ChildState> = {
  ali: { id: "ali", name: "Али", letter: "А", mode: "full" },
  said: { id: "said", name: "Саид", letter: "С", mode: "little-hero" },
};

async function loadAvatar(id: "ali" | "said"): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/children`);
    const children = await res.json();
    if (Array.isArray(children)) {
      const child = children.find((c: any) => c.id === id);
      return child?.avatarUrl || undefined;
    }
  } catch {}
  return undefined;
}

export function ChildProvider({ children }: { children: ReactNode }) {
  const [currentChild, setCurrentChild] = useState<ChildState>(DEFAULT_CHILDREN.ali);
  const [loaded, setLoaded] = useState(false);

  const updateChild = (id: "ali" | "said") => {
    const base = id === "ali" ? DEFAULT_CHILDREN.ali : DEFAULT_CHILDREN.said;
    loadAvatar(id).then(avatarUrl => setCurrentChild({ ...base, avatarUrl }));
  };

  useEffect(() => {
    const saved = localStorage.getItem("aq-current-child");
    if (saved === "said" || saved === "ali") {
      updateChild(saved);
    } else {
      loadAvatar("ali").then(url => setCurrentChild(prev => ({ ...prev, avatarUrl: url })));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem("aq-current-child", currentChild.id);
    }
  }, [currentChild, loaded]);

  const switchChild = (id?: "ali" | "said") => {
    const nextId = id || (currentChild.id === "ali" ? "said" : "ali");
    updateChild(nextId);
  };

  if (!loaded) return null;

  return (
    <ChildContext.Provider value={{ currentChild, switchChild }}>
      {children}
    </ChildContext.Provider>
  );
}

export function useChild(): ChildContextType {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChild must be used within ChildProvider");
  return ctx;
}
