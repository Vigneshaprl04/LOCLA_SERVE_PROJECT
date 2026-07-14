const validateAIResponse = (aiRes, dbCategories = []) => {
  if (!aiRes || typeof aiRes !== "object") {
    return { isValid: false, reason: "Response is not a valid object" };
  }

  // 1. Strict status and urgency allowlist
  const allowedStatuses = ["matched", "needs_clarification", "no_match"];
  const allowedUrgencies = ["Low", "Medium", "High", "Emergency"];

  if (!allowedStatuses.includes(aiRes.status)) {
    return { isValid: false, reason: `Invalid status value: ${aiRes.status}` };
  }

  if (aiRes.urgency && !allowedUrgencies.includes(aiRes.urgency)) {
    aiRes.urgency = "Medium";
  }

  // 2. Validate field types and cap lengths
  if (aiRes.issueSummary && typeof aiRes.issueSummary === "string") {
    aiRes.issueSummary = aiRes.issueSummary.substring(0, 200);
  } else {
    aiRes.issueSummary = "Service request analysis completed.";
  }

  if (aiRes.recommendation && typeof aiRes.recommendation === "string") {
    aiRes.recommendation = aiRes.recommendation.substring(0, 300);
  } else {
    aiRes.recommendation = "Consult with a professional provider.";
  }

  if (Array.isArray(aiRes.searchKeywords)) {
    aiRes.searchKeywords = aiRes.searchKeywords
      .filter(k => typeof k === "string")
      .map(k => k.substring(0, 50))
      .slice(0, 10);
  } else {
    aiRes.searchKeywords = [];
  }

  if (aiRes.clarificationQuestion && typeof aiRes.clarificationQuestion === "string") {
    aiRes.clarificationQuestion = aiRes.clarificationQuestion.substring(0, 250);
  } else {
    aiRes.clarificationQuestion = null;
  }

  // 3. Verify serviceCategory against database categories
  if (aiRes.status === "matched") {
    if (!aiRes.serviceCategory || typeof aiRes.serviceCategory !== "string") {
      return { isValid: false, reason: "Matched status requires serviceCategory name" };
    }

    const cleanCategory = aiRes.serviceCategory.trim().toLowerCase();
    const matchedCategory = dbCategories.find(
      cat => cat.name.trim().toLowerCase() === cleanCategory
    );

    if (matchedCategory) {
      aiRes.serviceCategory = matchedCategory.name;
      aiRes.categoryId = matchedCategory.id;
    } else {
      return { isValid: false, reason: `Category not in database: ${aiRes.serviceCategory}` };
    }
  } else {
    aiRes.serviceCategory = null;
    aiRes.categoryId = null;
  }

  return { isValid: true, data: aiRes };
};

module.exports = validateAIResponse;
