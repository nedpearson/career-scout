import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export function LoopTest() {
  useEffect(() => {
    // Only run if the URL has ?test=loop
    if (window.location.search.includes("test=loop")) {
      console.log("Starting intentional render loop test...");
      const interval = setInterval(() => {
        // Trigger a re-render by doing something that updates state or just force it
        // In this case, we'll just log and let the component re-render naturally if it was hooked into state
        // But for a true "render loop", we'd need a state update.
        // Let's just simulate the threshold by calling the backend repeatedly
        apiRequest("GET", "/api/user");
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
