import axios from "axios";
import { Platform } from "react-native";

// Resolve Android vs iOS emulator localhost routing address limits
const API_URL = Platform.OS === "android" ? "http://10.0.2.2:5000/api" : "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
