const db = require("../config/db");

exports.getProviderById = async (req, res) => {
  try {
    const { providerId } = req.params;

    const [providers] = await db.query(
      `SELECT
        p.id AS provider_id,
        p.user_id,
        u.name,
        u.email,
        u.phone,
        p.category_id,
        sc.name AS category_name,
        p.experience,
        p.description,
        p.working_area,
        p.city,
        p.pincode,
        p.availability_status,
        p.verification_status,
        p.average_rating
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc
        ON p.category_id = sc.id
      WHERE p.id = ?
      AND p.verification_status = 'verified'
      AND u.is_active = TRUE`,
      [providerId]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    res.json({
      success: true,
      provider: providers[0],
    });
  } catch (error) {
    console.error('Get Provider Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      category_id,
      experience,
      description,
      working_area,
      city,
      pincode,
      latitude,
      longitude
    } = req.body;

    const [result] = await db.query(
      `UPDATE providers SET
       category_id = ?,
       experience = ?,
       description = ?,
       working_area = ?,
       city = ?,
       pincode = ?,
       latitude = ?,
       longitude = ?
       WHERE user_id = ?`,
      [
        category_id,
        experience,
        description,
        working_area,
        city,
        pincode,
        latitude || null,
        longitude || null,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    res.json({
      success: true,
      message: "Provider profile updated successfully"
    });
  } catch (error) {
    console.error("Update Provider Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [providers] = await db.query(
      `SELECT
        p.id AS provider_id,
        p.user_id,
        u.name,
        u.email,
        u.phone,
        p.category_id,
        sc.name AS category_name,
        p.experience,
        p.description,
        p.working_area,
        p.city,
        p.pincode,
        p.latitude,
        p.longitude,
        p.availability_status,
        p.verification_status,
        p.average_rating
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc ON p.category_id = sc.id
      WHERE p.user_id = ?`,
      [req.user.id]
    );

    if (providers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found"
      });
    }

    res.json({
      success: true,
      provider: providers[0]
    });
  } catch (error) {
    console.error("Get Provider Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { availability_status } = req.body;

    await db.query(
      `UPDATE providers
       SET availability_status = ?
       WHERE user_id = ?`,
      [availability_status, req.user.id]
    );

    res.json({
      success: true,
      message: "Availability updated"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.searchProviders = async (req, res) => {
  try {
    const { category_id, city, pincode } = req.query;

    let sql = `
      SELECT
        p.id AS provider_id,
        u.name,
        u.phone,
        p.category_id,
        sc.name AS category_name,
        p.experience,
        p.description,
        p.working_area,
        p.city,
        p.pincode,
        p.latitude,
        p.longitude,
        p.availability_status,
        p.verification_status,
        p.average_rating
      FROM providers p

      JOIN users u
      ON p.user_id = u.id

      LEFT JOIN service_categories sc
      ON p.category_id = sc.id

      WHERE u.is_active = TRUE
      AND p.verification_status = 'verified'
    `;

    const values = [];

    if (category_id) {
      sql += " AND p.category_id = ?";
      values.push(category_id);
    }

    if (city) {
      sql += " AND p.city LIKE ?";
      values.push(`%${city}%`);
    }

    if (pincode) {
      sql += " AND p.pincode = ?";
      values.push(pincode);
    }

    sql += `
      ORDER BY
      p.availability_status DESC,
      p.average_rating DESC
    `;

    const [providers] = await db.query(sql, values);

    res.json({
      success: true,
      count: providers.length,
      providers
    });
  } catch (error) {
    console.error("Search Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const { findProviders } = require("../utils/nearbySearchHelper");

exports.getNearbyProviders = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 20,
      category_id
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const searchRadius = Number(radius);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(searchRadius) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      searchRadius <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude, longitude, or radius"
      });
    }

    const providers = await findProviders({
      categoryId: category_id,
      latitude: lat,
      longitude: lng,
      radius: searchRadius
    });

    res.json({
      success: true,
      count: providers.length,
      searchLocation: {
        latitude: lat,
        longitude: lng
      },
      radiusKm: searchRadius,
      providers
    });
  } catch (error) {
    console.error("Nearby Provider Search Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
