const db = require("../config/db");

const findProviders = async ({
  categoryId,
  latitude,
  longitude,
  radius = 20
}) => {
  // If coordinates are provided, perform Haversine distance lookup
  if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const searchRadius = Number(radius);

    const sql = `
      SELECT
        p.id AS provider_id,
        p.user_id,
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
        p.average_rating,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = p.id AND booking_status = 'completed') AS completed_booking_count,
        (
          6371 * ACOS(
            LEAST(
              1,
              GREATEST(
                -1,
                COS(RADIANS(?))
                * COS(RADIANS(p.latitude))
                * COS(
                    RADIANS(p.longitude)
                    - RADIANS(?)
                  )
                + SIN(RADIANS(?))
                * SIN(RADIANS(p.latitude))
              )
            )
          )
        ) AS distance_km
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc ON p.category_id = sc.id
      WHERE p.verification_status = 'verified'
        AND p.availability_status = TRUE
        AND u.is_active = TRUE
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        ${categoryId ? "AND p.category_id = ?" : ""}
      HAVING distance_km <= ?
      ORDER BY distance_km ASC, p.average_rating DESC
      LIMIT 50
    `;

    const values = [lat, lng, lat];
    if (categoryId) {
      values.push(Number(categoryId));
    }
    values.push(searchRadius);

    const [rows] = await db.query(sql, values);
    return rows;
  } else {
    // If coordinates are NOT provided, return all matching category providers sorted by rating
    const sql = `
      SELECT
        p.id AS provider_id,
        p.user_id,
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
        p.average_rating,
        (SELECT COUNT(*) FROM bookings WHERE provider_id = p.id AND booking_status = 'completed') AS completed_booking_count,
        NULL AS distance_km
      FROM providers p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN service_categories sc ON p.category_id = sc.id
      WHERE p.verification_status = 'verified'
        AND p.availability_status = TRUE
        AND u.is_active = TRUE
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        ${categoryId ? "AND p.category_id = ?" : ""}
      ORDER BY p.average_rating DESC
      LIMIT 50
    `;

    const values = [];
    if (categoryId) {
      values.push(Number(categoryId));
    }

    const [rows] = await db.query(sql, values);
    return rows;
  }
};

module.exports = { findProviders };
