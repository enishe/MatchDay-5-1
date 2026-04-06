import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar      from './components/Navbar';
import Dashboard   from './pages/Dashboard';
import BookingPage from './pages/BookingPage';
import MatchDetail from './pages/MatchDetail';
import Equipment   from './pages/Equipment';
import AdminPanel  from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"          element={<Dashboard />}   />
        <Route path="/booking"   element={<BookingPage />} />
        <Route path="/match/:id" element={<MatchDetail />} />
        <Route path="/equipment" element={<Equipment />}   />
        <Route path="/admin"     element={<AdminPanel />}  />
      </Routes>
    </BrowserRouter>
  );
}