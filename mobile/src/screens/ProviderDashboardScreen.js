import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import api from "../api";

export default function ProviderDashboardScreen({ navigation, auth }) {
  const [jobs, setJobs] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const jobsRes = await api.get("/bookings/my"); // reusing bookings lists
      setJobs(jobsRes.data.bookings || []);
      
      // Compute earnings from completed paid bookings
      const completedPaid = (jobsRes.data.bookings || []).filter(
        b => b.booking_status === "completed" && b.payment_status === "paid"
      );
      const gross = completedPaid.reduce((sum, item) => sum + Number(item.final_price || item.estimated_price || 0), 0);
      setEarnings(gross);
    } catch (err) {
      console.log("Error loading dashboard metrics:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStatusChange = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      Alert.alert("Success", `Booking status updated to ${status}`);
      fetchDashboardData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update status.");
    }
  };

  const renderJob = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.status}>{item.booking_status.toUpperCase()}</Text>
          <Text style={styles.price}>₹{item.estimated_price}</Text>
        </View>
        <Text style={styles.title}>Customer: {item.user_name}</Text>
        <Text style={styles.address}>{item.service_address}</Text>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.chatBtn} 
            onPress={() => navigation.navigate("Chat", { bookingId: item.id })}
          >
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>

          {item.booking_status === "pending" && (
            <TouchableOpacity 
              style={styles.acceptBtn} 
              onPress={() => handleStatusChange(item.id, "accepted")}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          )}

          {item.booking_status === "accepted" && (
            <TouchableOpacity 
              style={styles.startBtn} 
              onPress={() => handleStatusChange(item.id, "started")}
            >
              <Text style={styles.btnText}>Start Work</Text>
            </TouchableOpacity>
          )}

          {item.booking_status === "started" && (
            <TouchableOpacity 
              style={styles.completeBtn} 
              onPress={() => handleStatusChange(item.id, "completed")}
            >
              <Text style={styles.btnText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileRow}>
        <View>
          <Text style={styles.name}>{auth.user?.name}</Text>
          <Text style={styles.role}>Professional Partner</Text>
        </View>
        <TouchableOpacity style={styles.logout} onPress={auth.signOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats widgets row */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Earnings</Text>
          <Text style={styles.statValue}>₹{earnings.toFixed(2)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Presence Mode</Text>
          <TouchableOpacity 
            style={[styles.statusToggle, isOnline ? styles.online : styles.offline]}
            onPress={() => setIsOnline(!isOnline)}
          >
            <Text style={styles.statusToggleText}>{isOnline ? "Online" : "Offline"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.jobsHeading}>Assigned Jobs & Work Orders</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>You have no assigned jobs currently.</Text>
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
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  name: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold"
  },
  role: {
    color: "#64748b",
    fontSize: 12
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
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    padding: 16
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4
  },
  statValue: {
    color: "#10b981",
    fontSize: 18,
    fontWeight: "900"
  },
  statusToggle: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
    marginTop: 4
  },
  online: {
    backgroundColor: "#10b981"
  },
  offline: {
    backgroundColor: "#ef4444"
  },
  statusToggleText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12
  },
  jobsHeading: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12
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
    fontSize: 15,
    fontWeight: "bold"
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
  acceptBtn: {
    flex: 1,
    backgroundColor: "#7c3aed",
    borderRadius: 4,
    padding: 10,
    alignItems: "center"
  },
  startBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
    padding: 10,
    alignItems: "center"
  },
  completeBtn: {
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
    marginTop: 40
  }
});
