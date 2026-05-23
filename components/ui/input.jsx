import * as React from "react"
import { Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

function Input({ className, type, value, onChange, ...props }) {
  if (type === "date" || type === "time" || type === "datetime-local") {
    const isEmpty = !value;
    const placeholder = type === "time" ? "hh:mm" : "mm/dd/yyyy";

    return (
      <div className="relative w-full group">
        <input
          type={type}
          value={value}
          onChange={onChange}
          data-slot="input"
          data-empty={isEmpty ? "" : undefined}
          className={cn(
            "h-10 w-full rounded-md border border-input bg-white py-2 text-sm text-gray-900",
            "pl-3 pr-9 md:px-3",
            "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-gray-300",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className
          )}
          {...props}
        />

        {/* Custom placeholder — mobile only, shown when empty, hidden when focused */}
        {isEmpty && (
          <span className="md:hidden pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500 group-focus-within:hidden select-none">
            {placeholder}
          </span>
        )}

        {/* Clock icon — mobile only, only when empty and not focused */}
        {isEmpty && type === "time" && (
          <span className="md:hidden pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 group-focus-within:hidden select-none">
            <Clock size={15} strokeWidth={2} />
          </span>
        )}

        {/* Calendar icon — mobile only, always visible for date inputs, hidden when focused */}
        {type !== "time" && (
          <span className="md:hidden pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 group-focus-within:hidden select-none">
            <Calendar size={15} strokeWidth={2} />
          </span>
        )}
      </div>
    )
  }

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      data-slot="input"
      className={cn(
        "file: h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-gray-900 file:border-0 file:bg-transparent file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
