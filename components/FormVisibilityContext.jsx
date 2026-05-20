import React, { createContext, useContext, useState } from "react";

const FormVisibilityContext = createContext(null);

export function FormVisibilityProvider({ children }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <FormVisibilityContext.Provider value={{ showForm, setShowForm }}>
      {children}
    </FormVisibilityContext.Provider>
  );
}

export function useFormVisibility() {
  const ctx = useContext(FormVisibilityContext);
  if (!ctx) {
    throw new Error("useFormVisibility must be used within a FormVisibilityProvider");
  }
  return ctx;
}

export default FormVisibilityContext;
