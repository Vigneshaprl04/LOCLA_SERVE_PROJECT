const db = require("../config/db");
const createNotification = require("../utils/createNotification");

exports.getPendingProviders = async (req, res) => {
  try {
    const [providers] = await db.query(`
      SELECT
        p.id AS provider_id,
        u.id AS user_id,
        u.name,
        u.email,
        u.phone,
        sc.name AS category_name,
        p.experience,
        p.description,
        p.working_area,
        p.city,
        p.pincode,
        p.verification_status
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc ON p.category_id = sc.id
      WHERE p.verification_status = 'pending'
      ORDER BY p.id DESC
    `);

    res.json({
      success: true,
      count: providers.length,
      providers
    });
  } catch (error) {
    console.error("Get Pending Providers Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateProviderVerification = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { status } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be verified or rejected"
      });
    }

    const [providers] = await db.query(
      `SELECT id, user_id
       FROM providers
       WHERE id = ?`,
      [providerId]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider not found"
      });
    }

    const [result] = await db.query(
      `UPDATE providers
       SET verification_status = ?
       WHERE id = ?`,
      [status, providerId]
    );

    const io = req.app.get("io");

    await createNotification({
      io,
      userId: providers[0].user_id,
      title: "Provider Verification Updated",
      message: `Your provider account has been ${status}`,
      type: "provider_verification"
    });

    res.json({
      success: true,
      message: `Provider ${status} successfully`
    });
  } catch (error) {
    console.error("Provider Verification Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
