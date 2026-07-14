const db = require("../config/db");
const { analyzeProblem } = require("../services/aiService");
const validateAIResponse = require("../utils/validateAIResponse");
const { findProviders } = require("../utils/nearbySearchHelper");

exports.analyzeService = async (req, res) => {
  try {
    const { problem, latitude, longitude, conversationContext = [] } = req.body;

    // 1. Request Input Validation
    if (!problem || typeof problem !== "string" || !problem.trim()) {
      return res.status(400).json({
        success: false,
        message: "Problem description is required and must be a valid text string."
      });
    }

    // Cap inputs to prevent overflow and control costs
    const cleanProblem = problem.substring(0, 500);

    let lat = null;
    let lng = null;

    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      lat = Number(latitude);
      lng = Number(longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude coordinates."
        });
      }
    }

    // Cap conversation context turns
    let boundedContext = [];
    if (Array.isArray(conversationContext)) {
      boundedContext = conversationContext
        .filter(c => c && typeof c === "object" && ["user", "model"].includes(c.role) && typeof c.content === "string")
        .map(c => ({ role: c.role, content: c.content.substring(0, 250) }))
        .slice(-5); // keep only last 5 turns
    }

    // 2. Fetch Active Database Categories
    const [categories] = await db.query("SELECT id, name FROM service_categories");

    if (categories.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Service categories database is currently empty."
      });
    }

    // 3. Request Analysis from AI service
    const aiResult = await analyzeProblem(cleanProblem, categories, boundedContext);

    // 4. Validate and Sanitize AI Response
    let validated = validateAIResponse(aiResult, categories);

    if (!validated.isValid) {
      console.warn("AI output validation warning:", validated.reason);
      // Fallback: retry with fallback structure or convert to no_match
      const fallbackResult = {
        status: "no_match",
        serviceCategory: null,
        issueSummary: "Unable to classify the requested service category securely.",
        urgency: "Low",
        recommendation: "Please rewrite your request with standard service terms.",
        searchKeywords: [],
        clarificationQuestion: null
      };
      validated = validateAIResponse(fallbackResult, categories);
    }

    // 5. Query and Rank Providers if Matched
    let rankedProviders = [];

    if (validated.data.status === "matched" && validated.data.categoryId) {
      const rawProviders = await findProviders({
        categoryId: validated.data.categoryId,
        latitude: lat,
        longitude: lng,
        radius: 20 // Default search radius: 20km
      });

      // Rank providers using database stats
      rankedProviders = rawProviders.map(p => {
        const rating = Number(p.average_rating || 0);
        const completed = Number(p.completed_booking_count || 0);
        const exp = Number(p.experience || 0);
        const dist = p.distance_km !== null ? Number(p.distance_km) : null;

        // Rating Score: normalized from 0-5 stars to 40 max points
        const ratingScore = (rating / 5) * 40;

        // Completed Bookings Score: 2 points per completed job, capped at 20 points (10 jobs)
        const completedScore = Math.min(completed, 10) * 2;

        // Distance Score: closer is better, max 30 points
        let distanceScore = 20; // Default neutral fallback if coordinates are missing
        if (dist !== null) {
          if (dist <= 2) distanceScore = 30;
          else if (dist <= 5) distanceScore = 25;
          else if (dist <= 10) distanceScore = 20;
          else if (dist <= 20) distanceScore = 10;
          else distanceScore = 5;
        }

        // Experience Score: 1 point per year of experience, capped at 10 points
        const experienceScore = Math.min(exp, 10) * 1;

        const matchScore = Math.round(ratingScore + completedScore + distanceScore + experienceScore);

        // Dynamic match reason compilation
        const reasons = [];
        if (rating >= 4.5) {
          reasons.push("highly rated");
        }
        if (dist !== null && dist <= 5) {
          reasons.push("located close by");
        }
        if (completed >= 5) {
          reasons.push("experienced local specialist");
        }
        if (reasons.length === 0) {
          reasons.push("verified available provider");
        }

        // Sentence case joins
        const matchReason = reasons.join(" & ").charAt(0).toUpperCase() + reasons.join(" & ").slice(1) + ".";

        return {
          ...p,
          matchScore,
          matchReason
        };
      });

      // Sort descending by matchScore
      rankedProviders.sort((a, b) => b.matchScore - a.matchScore);
    }

    // 6. Return standard structured response
    res.json({
      success: true,
      analysis: validated.data,
      providers: rankedProviders
    });
  } catch (error) {
    console.error("AI Service Assistant Controller Error:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Server error processing AI assistant analysis request."
    });
  }
};
