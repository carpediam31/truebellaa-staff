import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Coupons from './pages/Coupons.jsx';
import Newsletter from './pages/Newsletter.jsx';
import Reviews from './pages/Reviews.jsx';
import Users from './pages/Users.jsx';
import Permissions from './pages/Permissions.jsx';
import EmailTemplates from './pages/EmailTemplates.jsx';
import Settings from './pages/Settings.jsx';
import Customers from './pages/Customers.jsx';
import Activity from './pages/Activity.jsx';
import Forbidden from './pages/Forbidden.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forbidden" element={<Forbidden />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<ProtectedRoute perms={['product.view']}><Products /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute perms={['order.view']}><Orders /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute perms={['coupon.manage']}><Coupons /></ProtectedRoute>} />
              <Route path="/newsletter" element={<ProtectedRoute perms={['newsletter.manage']}><Newsletter /></ProtectedRoute>} />
              <Route path="/reviews" element={<ProtectedRoute perms={['review.moderate']}><Reviews /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute perms={['customer.view']}><Customers /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute perms={['user.manage']}><Users /></ProtectedRoute>} />
              <Route path="/permissions" element={<ProtectedRoute perms={['role.manage']}><Permissions /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute perms={['settings.manage']}><Settings /></ProtectedRoute>} />
              <Route path="/email-templates" element={<ProtectedRoute perms={['settings.manage']}><EmailTemplates /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute perms={['audit.view']}><Activity /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
