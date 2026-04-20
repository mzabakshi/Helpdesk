import { Routes, Route } from "react-router";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import UsersPage from "./pages/UsersPage";
import TicketsPage from "./pages/TicketsPage";
import ProtectedLayout from "./components/ProtectedLayout";
import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tickets" element={<TicketsPage />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/users" element={<UsersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
