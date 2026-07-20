"use strict";

const db = require("../config/db");
const axios = require("axios");

// Helper to compile system instruction
const getSystemInstruction = (role) => {
  if (role === "chat") {
    return "You are LocalServe AI FAQ & Home Maintenance Assistant. Help the user with home service advice, quick tips, and troubleshooting. Keep answers under 3 sentences. Be polite, safe, and professional.";
  }
  if (role === "draft") {
    return "You are an AI Dispute Resolution Assistant. Rewrite the user's rough description of a dispute into a professional, formal dispute claim letter. Keep it polite, clear, structured, and under 150 words.";
  }
  if (role === "insights") {
    return "You are an Enterprise Analytics Auditor. Analyze the provided platform metrics. Summarize key observations and highlight any efficiency anomalies. Keep it under 4 sentences. Do not fabricate any other statistics.";
  }
  return "";
};

/**
 * Streams AI Chat replies using SSE.
 * Supports mock streaming if MOCK_AI=true or API Key is missing.
 */
exports.chatStream = async (req, res) => {
  const { message, conversationContext = [] } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const isMock = process.env.MOCK_AI === "true" || !apiKey;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (isMock) {
    // Word-by-word mock streamer
    const replies = [
      "Hello! I am your LocalServe assistant.",
      "For plumbing issues, we recommend checking the main shutoff valve first.",
      "If you experience electrical tripping, turn off heavy appliances and check the circuit breaker panel.",
      "Our verified service partners are fully certified and ready to help. You can book them instantly from your dashboard!"
    ];
    // Select reply based on keyword mapping
    let matchedReply = replies[0];
    const text = message.toLowerCase();
    if (text.includes("leak") || text.includes("water") || text.includes("plumb")) matchedReply = replies[1];
    else if (text.includes("tripping") || text.includes("power") || text.includes("electricity")) matchedReply = replies[2];
    else if (text.includes("book") || text.includes("provider") || text.includes("partner")) matchedReply = replies[3];

    const words = matchedReply.split(" ");
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < words.length) {
        sendEvent({ text: words[index] + " " });
        index++;
      } else {
        sendEvent({ done: true });
        clearInterval(interval);
        res.end();
      }
    }, 100);

    req.on("close", () => {
      clearInterval(interval);
    });
    return;
  }

  try {
    const contents = conversationContext.map(turn => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }]
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const response = await axios.post(url, {
      contents,
      systemInstruction: { parts: [{ text: getSystemInstruction("chat") }] },
      generationConfig: { maxOutputTokens: 250, temperature: 0.3 }
    }, { responseType: "stream" });

    response.data.on("data", (chunk) => {
      const chunkStr = chunk.toString();
      // Parse SSE events from google stream
      const lines = chunkStr.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6));
            const textSegment = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (textSegment) {
              sendEvent({ text: textSegment });
            }
          } catch (e) {
            // Ignore parse errors on trailing chunks
          }
        }
      }
    });

    response.data.on("end", () => {
      sendEvent({ done: true });
      res.end();
    });

    req.on("close", () => {
      response.data.destroy();
    });
  } catch (err) {
    console.error("[Stream] Gemini API Stream error:", err.message);
    sendEvent({ error: "Failed to stream AI response." });
    res.end();
  }
};

/**
 * Personalized customer recommendations based on booking history.
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const [bookings] = await db.query(
      `SELECT DISTINCT sc.name 
       FROM bookings b 
       JOIN providers p ON b.provider_id = p.id 
       JOIN service_categories sc ON p.category_id = sc.id 
       WHERE b.user_id = ? 
       ORDER BY b.id DESC 
       LIMIT 2`,
      [userId]
    );

    const recs = bookings.map(b => b.name);
    // Add default fallbacks if history is empty
    if (!recs.includes("Electrician")) recs.push("Electrician");
    if (recs.length < 2 && !recs.includes("Plumber")) recs.push("Plumber");

    return res.json({
      success: true,
      recommendations: recs.slice(0, 2)
    });
  } catch (error) {
    console.error("AI recommendations error:", error.message);
    return res.status(500).json({ success: false, message: "Server error fetching recommendations." });
  }
};

/**
 * Dynamic AI reply suggestions for chat pages.
 */
exports.getReplySuggestions = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required." });
    }

    const [msgs] = await db.query(
      "SELECT message FROM chat_messages WHERE booking_id = ? ORDER BY id DESC LIMIT 1",
      [bookingId]
    );

    const lastMsg = msgs[0]?.message || "";
    let suggestions = [
      "I'm ready to discuss this.",
      "What timing works for you?",
      "Can you share more details?"
    ];

    // Semantic keyword mapping suggestions
    const lower = lastMsg.toLowerCase();
    if (lower.includes("price") || lower.includes("cost") || lower.includes("charge")) {
      suggestions = ["I can offer a quote.", "Let's align on estimation.", "It fits within our budget."];
    } else if (lower.includes("address") || lower.includes("where") || lower.includes("location")) {
      suggestions = ["I'll share coordinates.", "Address is updated.", "Coordinates sent."];
    } else if (lower.includes("time") || lower.includes("when") || lower.includes("arrive")) {
      suggestions = ["On my way shortly.", "Ready in 10 minutes.", "Arriving by tomorrow."];
    }

    return res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error("AI reply suggestions error:", error.message);
    return res.status(500).json({ success: false, message: "Server error generating suggestions." });
  }
};

/**
 * AI Dispute drafting letter assistance.
 */
exports.draftDispute = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Dispute details description is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isMock = process.env.MOCK_AI === "true" || !apiKey;

    if (isMock) {
      const draft = `Formal Dispute Claim Letter\n\nDear LocalServe Administration Support,\n\nI am writing to officially report an issue regarding my service booking. ${description.trim()} I request a formal review of the scheduling details, billing parameters, and booking status to reach a mutual resolution.\n\nThank you for your prompt assistance.\n\nSincerely,\nLocalServe Platform User`;
      return res.json({ success: true, draft });
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = `User raw text details: "${description.trim()}"`;

    const response = await axios.post(url, {
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: getSystemInstruction("draft") }] },
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
    });

    const draft = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return res.json({ success: true, draft });
  } catch (error) {
    console.error("AI dispute drafting error:", error.message);
    return res.status(500).json({ success: false, message: "Server error drafting dispute." });
  }
};

/**
 * Admin insights compiler. Calculates real metrics totals and generates anomalies summary.
 */
exports.getAdminInsights = async (req, res) => {
  try {
    const [bookingCounts] = await db.query(
      `SELECT 
         SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
         COUNT(*) AS total
       FROM bookings`
    );

    const [disputes] = await db.query(
      "SELECT COUNT(*) AS openDisputes FROM complaints WHERE status != 'resolved'"
    );

    const [revenue] = await db.query(
      "SELECT SUM(amount) AS totalGross FROM payments WHERE status = 'paid'"
    );

    const metrics = {
      completedBookings: Number(bookingCounts[0]?.completed || 0),
      cancelledBookings: Number(bookingCounts[0]?.cancelled || 0),
      totalBookings: Number(bookingCounts[0]?.total || 0),
      openDisputes: Number(disputes[0]?.openDisputes || 0),
      totalGrossRevenue: Number(revenue[0]?.totalGross || 0)
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const isMock = process.env.MOCK_AI === "true" || !apiKey;

    if (isMock) {
      let insightText = `LocalServe platform summary highlights completed service delivery count at ${metrics.completedBookings}. `;
      if (metrics.cancelledBookings > 2) {
        insightText += `Warning: Cancellation rate is currently elevated at ${((metrics.cancelledBookings / metrics.totalBookings) * 100).toFixed(1)}%. Inspect pricing limits or provider availability parameters.`;
      } else {
        insightText += "Performance metrics remain stable with no major operational anomalies detected.";
      }
      return res.json({ success: true, insights: insightText, metrics });
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = `Current Database Metrics: ${JSON.stringify(metrics)}`;

    const response = await axios.post(url, {
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: getSystemInstruction("insights") }] },
      generationConfig: { maxOutputTokens: 250, temperature: 0.2 }
    });

    const insights = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return res.json({ success: true, insights, metrics });
  } catch (error) {
    console.error("AI admin insights error:", error.message);
    return res.status(500).json({ success: false, message: "Server error compiling admin insights." });
  }
};
