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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
          {!mounted ? (
            <span className="h-5 w-5 inline-block" aria-hidden="true" />
          ) : theme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : theme === "system" ? (
            <Monitor className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
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

