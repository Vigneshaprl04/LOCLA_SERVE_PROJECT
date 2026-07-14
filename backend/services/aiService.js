const axios = require("axios");

// Deterministic mock responder for offline/testing mode
const getMockResponse = (problem, conversationContext = []) => {
  const text = (problem + " " + conversationContext.map(c => c.content).join(" ")).toLowerCase();

  if (text.includes("motor")) {
    if (text.includes("water") || text.includes("pump") || text.includes("veetu") || text.includes("home")) {
      return {
        status: "matched",
        serviceCategory: "Plumber",
        issueSummary: "Water pump motor malfunction.",
        urgency: "Medium",
        recommendation: "Turn off the power switch to the pump to avoid burning the motor coil.",
        searchKeywords: ["plumber", "pump repair"],
        clarificationQuestion: null
      };
    }
    return {
      status: "needs_clarification",
      serviceCategory: null,
      issueSummary: "The type of motor is unclear.",
      urgency: "Low",
      recommendation: "Provide more details about what type of motor is malfunctioning.",
      searchKeywords: [],
      clarificationQuestion: "Is this a water pump motor, vehicle motor, appliance motor, or another type of motor?"
    };
  }

  if (text.includes("power") || text.includes("electrical") || text.includes("tripping") || text.includes("wire") || text.includes("shock")) {
    return {
      status: "matched",
      serviceCategory: "Electrician",
      issueSummary: "Electrical wiring or tripping problem.",
      urgency: "Emergency",
      recommendation: "Avoid touching exposed wires. Turn off the mains immediately.",
      searchKeywords: ["electrician", "electrical repair"],
      clarificationQuestion: null
    };
  }

  if (text.includes("ac") || text.includes("cooling")) {
    return {
      status: "matched",
      serviceCategory: "AC Repair",
      issueSummary: "AC cooling issue or leakage.",
      urgency: "Medium",
      recommendation: "Turn off the AC if water is leaking near electrical parts.",
      searchKeywords: ["AC repair", "AC service"],
      clarificationQuestion: null
    };
  }

  if (text.includes("pipe") || text.includes("leak") || text.includes("clog") || text.includes("plumbing")) {
    return {
      status: "matched",
      serviceCategory: "Plumber",
      issueSummary: "Plumbing leak or pipe damage.",
      urgency: "High",
      recommendation: "Shut off the main water valve to prevent flooding.",
      searchKeywords: ["plumber", "pipe leak"],
      clarificationQuestion: null
    };
  }

  if (text.includes("laptop") || text.includes("computer") || text.includes("device")) {
    return {
      status: "matched",
      serviceCategory: "Appliance Repair",
      issueSummary: "Computer or laptop hardware issue.",
      urgency: "Low",
      recommendation: "Shut down the device to prevent overheating.",
      searchKeywords: ["laptop repair", "appliance repair"],
      clarificationQuestion: null
    };
  }

  if (text.includes("bike") || text.includes("car") || text.includes("vehicle") || text.includes("engine")) {
    return {
      status: "matched",
      serviceCategory: "Mechanic",
      issueSummary: "Vehicle or bike mechanical failure.",
      urgency: "Medium",
      recommendation: "Avoid starting the engine if there are strange noises.",
      searchKeywords: ["mechanic", "bike repair"],
      clarificationQuestion: null
    };
  }

  if (text.includes("clean") || text.includes("house") || text.includes("broom") || text.includes("office")) {
    return {
      status: "matched",
      serviceCategory: "Cleaning Service",
      issueSummary: "Cleaning service request.",
      urgency: "Low",
      recommendation: "Gather fragile objects before the cleaners arrive.",
      searchKeywords: ["cleaner", "house cleaning"],
      clarificationQuestion: null
    };
  }

  return {
    status: "no_match",
    serviceCategory: null,
    issueSummary: "No service matched for this request.",
    urgency: "Low",
    recommendation: "Please try rephrasing your problem with more specific details.",
    searchKeywords: [],
    clarificationQuestion: null
  };
};

const analyzeProblem = async (problem, categories, conversationContext = []) => {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const apiKey = process.env.GEMINI_API_KEY;

  if (process.env.MOCK_AI === "false" && (!apiKey || apiKey === "YOUR_GEMINI_API_KEY")) {
    const err = new Error("AI service is not configured (API key missing).");
    err.statusCode = 500;
    throw err;
  }

  // Use mock mode if explicitly requested or if no API key is available
  if (process.env.MOCK_AI === "true" || !apiKey) {
    console.log("🤖 Running in Mock AI mode...");
    const mockRes = getMockResponse(problem, conversationContext);
    mockRes.isRealGemini = false;
    return mockRes;
  }

  const systemInstruction = `
    You are a Local Service Assistant. Analyze the user's service issue and help identify their needs.
    Available Database Service Categories are: ${JSON.stringify(categories)}.
    
    CRITICAL RULES:
    1. The "serviceCategory" field in the output MUST strictly match one of the available categories listed above (case-insensitive) or be null.
    2. If the user's request matches a category, set "status" to "matched" and "serviceCategory" to the exact matching category from the list.
    3. If the request is ambiguous (e.g. "motor not working"), set "status" to "needs_clarification", "serviceCategory" to null, and specify a follow-up question in "clarificationQuestion".
    4. If the request does not fit any category (e.g. asking for recipe, writing a poem), set "status" to "no_match", "serviceCategory" to null.
    5. Always return strict structured JSON format. Avoid claims of technical certainty. Keep recommendations short and safe.

    Output format:
    {
      "status": "matched | needs_clarification | no_match",
      "serviceCategory": "Category Name or null",
      "issueSummary": "Short summary of the problem",
      "urgency": "Low | Medium | High | Emergency",
      "recommendation": "Safe next-step recommendation",
      "searchKeywords": ["keyword1", "keyword2"],
      "clarificationQuestion": "Question or null"
    }
  `;

  // Build messages array
  const contents = [];
  
  // Add conversation history
  for (const turn of conversationContext) {
    contents.push({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }]
    });
  }
  
  // Add the current prompt
  contents.push({
    role: "user",
    parts: [{ text: `User request: ${problem}` }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await axios.post(url, {
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 500,
        temperature: 0.2
      }
    }, {
      timeout: 30000 // 30s request timeout
    });

    const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Empty response from Gemini API");
    }

    console.log("Candidate text received:", candidateText);
    const parsed = JSON.parse(candidateText.trim());
    parsed.isRealGemini = true;
    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error.message);

    let mappedError;
    if (error.response) {
      const status = error.response.status;
      if (status === 429) {
        mappedError = new Error("AI service is busy right now. Please try again shortly.");
        mappedError.statusCode = 429;
      } else if (status >= 500) {
        mappedError = new Error("AI service is temporarily unavailable. Please try again later.");
        mappedError.statusCode = 503;
      } else {
        mappedError = new Error("AI service request configuration mismatch.");
        mappedError.statusCode = 500;
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.code === 'ECONNRESET') {
      mappedError = new Error("AI service is temporarily unavailable. Please try again later.");
      mappedError.statusCode = 503;
    } else {
      mappedError = new Error(error.message || "An unexpected error occurred in AI service.");
      mappedError.statusCode = 500;
    }

    if (process.env.MOCK_AI === "false") {
      throw mappedError;
    }

    // Graceful fallback to mock response on rate limits / quota / network failures
    console.log("🤖 Graceful fallback to Mock AI mode due to:", mappedError.message);
    const mockRes = getMockResponse(problem, conversationContext);
    mockRes.isRealGemini = false;
    return mockRes;
  }
};

module.exports = { analyzeProblem };
