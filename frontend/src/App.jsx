import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserHome from './pages/UserHome';
import MyBookings from './pages/MyBookings';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderDetails from './pages/ProviderDetails';
import PaymentPage from './pages/PaymentPage';
import AdminDashboard from './pages/AdminDashboard';
import ChatPage from './pages/ChatPage';
import UserProfile from './pages/UserProfile';
import ProviderProfile from './pages/ProviderProfile';
import AIServiceAssistant from './pages/AIServiceAssistant';

import './App.css';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />

        {/* User */}
        <Route
          path="/user/home"
          element={
            <RoleRoute allowedRoles={['user']}>
              <UserHome />
            </RoleRoute>
          }
        />

        <Route
          path="/providers/:providerId"
          element={
            <RoleRoute allowedRoles={['user']}>
              <ProviderDetails />
            </RoleRoute>
          }
        />

        <Route
          path="/user/bookings"
          element={
            <RoleRoute allowedRoles={['user']}>
              <MyBookings />
            </RoleRoute>
          }
        />

        <Route
          path="/payment/:bookingId"
          element={
            <RoleRoute allowedRoles={['user']}>
              <PaymentPage />
            </RoleRoute>
          }
        />

        <Route
          path="/user/profile"
          element={
            <RoleRoute allowedRoles={['user']}>
              <UserProfile />
            </RoleRoute>
          }
        />

        <Route
          path="/user/assistant"
          element={
            <RoleRoute allowedRoles={['user']}>
              <AIServiceAssistant />
            </RoleRoute>
          }
        />

        <Route
          path="/chat/:bookingId"
          element={
            <RoleRoute allowedRoles={['user', 'provider']}>
              <ChatPage />
            </RoleRoute>
          }
        />

        {/* Provider */}
        <Route
          path="/provider/dashboard"
          element={
            <RoleRoute allowedRoles={['provider']}>
              <ProviderDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/provider/profile"
          element={
            <RoleRoute allowedRoles={['provider']}>
              <ProviderProfile />
            </RoleRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
