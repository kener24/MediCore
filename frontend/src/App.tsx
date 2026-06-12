import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import { router } from "./app/router";
import { AuthProvider } from "./features/auth/authStore";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
