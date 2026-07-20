import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import io from "socket.io-client";
import api from "../api";

export default function ChatScreen({ route, auth }) {
  const { bookingId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Fetch previous messages history
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/booking/${bookingId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.log("Error loading chat history:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();

    // 2. Initialize Socket.IO connection
    const serverUrl = Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
    const socket = io(serverUrl, {
      auth: { token: api.defaults.headers.common["Authorization"]?.split(" ")[1] }
    });

    socketRef.current = socket;

    socket.emit("join:booking:room", { bookingId });

    socket.on("message:receive", (msg) => {
      if (Number(msg.booking_id) === Number(bookingId)) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId]);

  const handleSend = () => {
    if (!text.trim() || !socketRef.current) return;

    socketRef.current.emit("message:send", {
      bookingId,
      message: text.trim()
    });
    setText("");
  };

  const renderMessage = ({ item }) => {
    const isMe = Number(item.sender_id) === Number(auth.user?.id);
    return (
      <View style={[styles.bubble, isMe ? styles.sentBubble : styles.receivedBubble]}>
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.timeText}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            inverted={false}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Write a message..."
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
            style={styles.input}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    justifyContent: "space-between"
  },
  list: {
    padding: 16,
    paddingBottom: 24
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  sentBubble: {
    backgroundColor: "#7c3aed",
    alignSelf: "flex-end"
  },
  receivedBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignSelf: "flex-start"
  },
  messageText: {
    color: "#ffffff",
    fontSize: 14
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 9,
    alignSelf: "flex-end",
    marginTop: 4
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#050816",
    alignItems: "center"
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: "#ffffff",
    marginRight: 10,
    fontSize: 14
  },
  sendBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  sendText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14
  }
});
