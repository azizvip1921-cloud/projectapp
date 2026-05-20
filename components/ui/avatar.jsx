"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const AvatarContext = React.createContext({
  showFallback: true,
  setShowFallback: () => {},
});

const Avatar = React.forwardRef(({ className, ...props }, ref) => {
  const [showFallback, setShowFallback] = React.useState(true);

  return (
    <AvatarContext.Provider value={{ showFallback, setShowFallback }}>
      <span
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef(
  ({ className, src, alt, ...props }, ref) => {
    const { setShowFallback } = React.useContext(AvatarContext);

    React.useEffect(() => {
      if (!src) {
        setShowFallback(true);
        return;
      }
      setShowFallback(true);
      const img = new Image();
      img.src = src;
      img.onload = () => setShowFallback(false);
      img.onerror = () => setShowFallback(true);
      return () => {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      };
    }, [src, setShowFallback]);

    if (!src) return null;

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          "aspect-square h-full w-full object-cover",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => {
  const { showFallback } = React.useContext(AvatarContext);

  if (!showFallback) return null;

  return (
    <span
      ref={ref}
      className={cn(
        "absolute inset-0 flex items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
