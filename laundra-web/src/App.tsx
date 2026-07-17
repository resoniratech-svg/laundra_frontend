import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './DatabaseContext';
import { LandingPage } from './LandingPage';
import { AdminPortal } from './AdminPortal';
import { CustomerPortal } from './CustomerPortal';
import { DeliveryPortal } from './DeliveryPortal';
import { SuperAdminPortal } from './SuperAdminPortal';
import { QRScanPage } from './QRScanPage';
import './index.css';

function App() {
  return (
    <DatabaseProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="/customer" element={<CustomerPortal />} />
          <Route path="/delivery" element={<DeliveryPortal />} />
          <Route path="/super-admin" element={<SuperAdminPortal />} />
          <Route path="/scan/:qr_token" element={<QRScanPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </DatabaseProvider>
  );
}

export default App;

