import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

function App() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div>
            Server status: {status ?? "loading..."}
          </div>
        }
      />
    </Routes>
  );
}

export default App;
