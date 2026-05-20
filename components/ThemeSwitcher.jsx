"use client"

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid rendering theme-dependent UI on the server to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which icon to show based on current theme (only after mount)
  const getThemeIcon = () => {
    if (!mounted) return null;
    if (theme === "dark") return Moon;
    if (theme === "system") return Monitor;
    return Sun;
  };

  const ThemeIcon = getThemeIcon();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className={`h-11 w-11 rounded-full border-2 ${
            theme === "system" ? "border-blue-500" : ""
          }`}
        >
          {ThemeIcon ? (
            <ThemeIcon className="h-5 w-5" />
          ) : (
            <span className="h-5 w-5 inline-block" aria-hidden="true" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")} 
          className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
            theme === "system" ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500" : ""
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

