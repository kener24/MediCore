import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { router } from "./app/router";
import { AuthProvider } from "./features/auth/authStore";

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<main aria-busy="true" aria-label="Cargando" style={{ minHeight: "100vh" }} />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
