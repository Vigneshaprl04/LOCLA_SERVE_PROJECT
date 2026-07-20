import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "./src/screens/LoginScreen";
import CustomerHomeScreen from "./src/screens/CustomerHomeScreen";
import ProviderDashboardScreen from "./src/screens/ProviderDashboardScreen";
import ChatScreen from "./src/screens/ChatScreen";
import MapTrackingScreen from "./src/screens/MapTrackingScreen";

const Stack = createStackNavigator();

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const authContextValue = {
    token,
    user,
    signIn: (authToken, userData) => {
      setToken(authToken);
      setUser(userData);
    },
    signOut: () => {
      setToken(null);
      setUser(null);
    }
  };

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#050816",
            borderBottomWidth: 1,
            borderBottomColor: "#1e1e38"
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "bold"
          },
          cardStyle: { backgroundColor: "#050816" }
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} auth={authContextValue} />}
          </Stack.Screen>
        ) : user.role === "provider" ? (
          <>
            <Stack.Screen name="ProviderDashboard" options={{ title: "Provider Dashboard" }}>
              {(props) => <ProviderDashboardScreen {...props} auth={authContextValue} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Customer Chat" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ title: "Find Services" }}>
              {(props) => <CustomerHomeScreen {...props} auth={authContextValue} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Partner Chat" }} />
            <Stack.Screen name="MapTracking" component={MapTrackingScreen} options={{ title: "Live Tracking" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
