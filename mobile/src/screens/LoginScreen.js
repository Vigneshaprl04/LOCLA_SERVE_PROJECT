import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import api from "../api";

export default function LoginScreen({ navigation, auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all credentials fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;
      
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      auth.signIn(token, user);
    } catch (err) {
      Alert.alert("Login Failed", err.response?.data?.message || "Invalid credentials. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert("Hardware Notice", "Biometric credentials are not enrolled on this device.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate with FaceID / TouchID",
      fallbackLabel: "Use Passcode"
    });

    if (result.success) {
      // For demonstration, logging in with admin credentials as local fallback
      setEmail("admin@localserve.com");
      setPassword("admin123");
      Alert.alert("Success", "Biometric match accepted!");
    } else {
      Alert.alert("Auth Failed", "Unable to match biometrics.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>LocalServe</Text>
      <Text style={styles.subtitle}>Enterprise Service Marketplace</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        {isBiometricSupported && (
          <TouchableOpacity style={styles.bioButton} onPress={handleBiometricAuth}>
            <Text style={styles.bioButtonText}>Log In with FaceID / TouchID</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  logo: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 40
  },
  form: {
    width: "100%",
    maxWidth: 320
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 14,
    color: "#ffffff",
    fontSize: 15,
    marginBottom: 16
  },
  button: {
    width: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16
  },
  bioButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 20
  },
  bioButtonText: {
    color: "#a78bfa",
    fontSize: 14,
    fontWeight: "600"
  }
});
