import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { ProviderPresenceProvider } from './context/ProviderPresenceContext.jsx';
import { BookingProvider } from './context/BookingContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProviderPresenceProvider>
          <BookingProvider>
            <ChatProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </ChatProvider>
          </BookingProvider>
        </ProviderPresenceProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

