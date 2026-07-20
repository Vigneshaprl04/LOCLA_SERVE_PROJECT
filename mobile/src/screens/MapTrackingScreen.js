import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import api from "../api";

export default function MapTrackingScreen({ route }) {
  const { bookingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [providerCoords, setProviderCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);

  useEffect(() => {
    let intervalId;

    const fetchTrackingCoordinates = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}/tracking`);
        const { provider_latitude, provider_longitude, customer_latitude, customer_longitude } = res.data.tracking || {};
        
        if (provider_latitude && provider_longitude) {
          setProviderCoords({
            latitude: Number(provider_latitude),
            longitude: Number(provider_longitude)
          });
        }
        if (customer_latitude && customer_longitude) {
          setCustomerCoords({
            latitude: Number(customer_latitude),
            longitude: Number(customer_longitude)
          });
        }
      } catch (err) {
        console.log("Error loading map coordinates:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingCoordinates();

    // Poll coordinates update every 5 seconds to simulate live motion
    intervalId = setInterval(fetchTrackingCoordinates, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Connecting to partner GPS satellite...</Text>
      </View>
    );
  }

  // Fallback coords if GPS signals are not enabled/mocked
  const initialRegion = {
    latitude: providerCoords?.latitude || customerCoords?.latitude || 13.0827,
    longitude: providerCoords?.longitude || customerCoords?.longitude || 80.2707,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {customerCoords && (
          <Marker 
            coordinate={customerCoords} 
            title="My Location" 
            pinColor="#7c3aed"
          />
        )}
        {providerCoords && (
          <Marker 
            coordinate={providerCoords} 
            title="Service Professional" 
            pinColor="#10b981"
          />
        )}
        {customerCoords && providerCoords && (
          <Polyline
            coordinates={[customerCoords, providerCoords]}
            strokeColor="#7c3aed"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center"
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height
  },
  loadingText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 10
  }
});
