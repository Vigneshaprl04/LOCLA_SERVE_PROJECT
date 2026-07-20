# LocalServe Enterprise Mobile App

A premium, cross-platform mobile application shell built using React Native (Expo) designed to reuse the existing LocalServe backend APIs for customers and providers.

---

## Technical Architecture

The app is structured to load navigation dynamically based on the authentication user role (`customer` vs `provider`).

```
mobile/
├── App.js                   # Navigation Stack manager & Auth session state
├── package.json             # React Native dependencies
└── src/
    ├── api.js               # Central Axios client routing to the backend
    └── screens/
        ├── LoginScreen.js             # Biometrics auth logic & credentials login
        ├── CustomerHomeScreen.js      # List customer bookings & navigate actions
        ├── ProviderDashboardScreen.js  # Toggle presence status, earnings tracking
        ├── ChatScreen.js              # Live messages feed connected via Socket.IO
        └── MapTrackingScreen.js       # Renders react-native-maps track points overlay
```

---

## Installation & Running

### 1. Install Dependencies
Make sure you have Node.js and the Expo CLI tools installed, then run inside the `mobile` directory:
```bash
npm install
```

### 2. Configure API Endpoint
The default backend REST server mapping addresses are pre-configured inside `mobile/src/api.js`:
- Android Emulator: maps automatically to standard loopback port `http://10.0.2.2:5000/api`
- iOS Simulator: maps to `http://localhost:5000/api`
- Real Device: Replace with your developer machine's internal network IP address (e.g. `http://192.168.1.50:5000/api`).

### 3. Launch the Expo Dev Bundler
```bash
npm start
```
- Press `a` to load Android Emulator.
- Press `i` to launch iOS Simulator.
- Scan the QR code using the Expo Go mobile app (Android or iOS) to run on a physical device over the local network.

---

## Support Integrations

- **Biometric authentication**: Controlled via `expo-local-authentication`. The login screen checks for FaceID / TouchID hardware capabilities and triggers authentication sheets.
- **Offline Mode**: Cache filters and list items using simple local adapters (such as `AsyncStorage`) to fallback when networks are unavailable.
- **Push Notification Services**: Subscriptions can be configured by registering native devices endpoints via Expo Push Notifications services inside App.js boot scripts.
