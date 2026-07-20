import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import api from "../api";

export default function CustomerHomeScreen({ navigation, auth }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings/my");
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.log("Error loading mobile user bookings:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const renderBooking = ({ item }) => {
    const isTrackable = ["accepted", "on_the_way", "work_started"].includes(item.booking_status);
    
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.status}>{item.booking_status.toUpperCase()}</Text>
          <Text style={styles.price}>₹{item.estimated_price}</Text>
        </View>
        <Text style={styles.title}>{item.category_name} Service</Text>
        <Text style={styles.provider}>Partner: {item.provider_name}</Text>
        <Text style={styles.address}>{item.service_address}</Text>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.chatBtn} 
            onPress={() => navigation.navigate("Chat", { bookingId: item.id })}
          >
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>

          {isTrackable && (
            <TouchableOpacity 
              style={styles.trackBtn} 
              onPress={() => navigation.navigate("MapTracking", { bookingId: item.id })}
            >
              <Text style={styles.btnText}>Track GPS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.welcomeRow}>
        <Text style={styles.welcome}>Welcome, {auth.user?.name || "Customer"}</Text>
        <TouchableOpacity style={styles.logout} onPress={auth.signOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>You have no booking requests yet.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    padding: 16
  },
  welcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  welcome: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold"
  },
  logout: {
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 4
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 12
  },
  list: {
    paddingBottom: 20
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  status: {
    color: "#a78bfa",
    fontWeight: "bold",
    fontSize: 12
  },
  price: {
    color: "#ffffff",
    fontWeight: "bold"
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold"
  },
  provider: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4
  },
  address: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  chatBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 4,
    padding: 10,
    alignItems: "center"
  },
  trackBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 4,
    padding: 10,
    alignItems: "center"
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13
  },
  empty: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 60
  }
});
