"use strict";

const db = require("../config/db");

/**
 * Provider Repository to handle database operations for providers.
 */
class ProviderRepository {
  /**
   * Fetch provider profile details by User ID.
   * @param {number} userId 
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @param {boolean} [options.lock] - Whether to apply FOR UPDATE lock
   * @returns {Promise<Object|null>}
   */
  async getProfileByUserId(userId, options = {}) {
    try {
      const conn = options.connection || db;
      let sql = `SELECT
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
          p.is_online,
          p.last_seen,
          p.verification_status,
          p.average_rating,
          p.last_location_updated_at
        FROM providers p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN service_categories sc ON p.category_id = sc.id
        WHERE p.user_id = ?`;
      
      if (options.lock) {
        sql += " FOR UPDATE";
      }

      const [rows] = await conn.query(sql, [userId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error in getProfileByUserId:", error.message);
      throw new Error(`Database error in getProfileByUserId: ${error.message}`);
    }
  }

  /**
   * Fetch provider details by Provider ID.
   * @param {number} id 
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @param {boolean} [options.lock] - Whether to apply FOR UPDATE lock
   * @returns {Promise<Object|null>}
   */
  async getProviderById(id, options = {}) {
    try {
      const conn = options.connection || db;
      let sql = `SELECT
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
          p.is_online,
          p.last_seen,
          p.verification_status,
          p.average_rating
        FROM providers p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN service_categories sc ON p.category_id = sc.id
        WHERE p.id = ?`;

      if (options.lock) {
        sql += " FOR UPDATE";
      }

      const [rows] = await conn.query(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error in getProviderById:", error.message);
      throw new Error(`Database error in getProviderById: ${error.message}`);
    }
  }

  /**
   * Update the is_online status and last_seen timestamp.
   * @param {number} userId 
   * @param {boolean|number} isOnline 
   * @param {Date|string} lastSeen 
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @returns {Promise<boolean>}
   */
  async updateOnlineStatus(userId, isOnline, lastSeen, options = {}) {
    try {
      const conn = options.connection || db;
      const isOnlineVal = isOnline ? 1 : 0;
      const [result] = await conn.query(
        `UPDATE providers
         SET is_online = ?, availability_status = ?, last_seen = ?
         WHERE user_id = ?`,
        [isOnlineVal, isOnlineVal, lastSeen || null, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error in updateOnlineStatus:", error.message);
      throw new Error(`Database error in updateOnlineStatus: ${error.message}`);
    }
  }

  /**
   * Fetch all online and verified providers.
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @returns {Promise<Array>}
   */
  async getOnlineProviders(options = {}) {
    try {
      const conn = options.connection || db;
      const [rows] = await conn.query(
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
          p.is_online,
          p.last_seen,
          p.availability_status,
          p.verification_status,
          p.average_rating
        FROM providers p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN service_categories sc ON p.category_id = sc.id
        WHERE p.verification_status = 'verified'
          AND u.is_active = TRUE
          AND p.is_online = 1`
      );
      return rows;
    } catch (error) {
      console.error("Error in getOnlineProviders:", error.message);
      throw new Error(`Database error in getOnlineProviders: ${error.message}`);
    }
  }

  /**
   * Search providers based on category, location, and online status.
   * @param {Object} filters 
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @returns {Promise<Array>}
   */
  async searchProviders(filters = {}, options = {}) {
    try {
      const conn = options.connection || db;
      const { category_id, city, pincode, available_now } = filters;

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
          p.is_online,
          p.last_seen,
          p.verification_status,
          p.average_rating
        FROM providers p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN service_categories sc ON p.category_id = sc.id
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

      if (available_now === true || available_now === "true" || available_now === 1 || available_now === "1") {
        sql += " AND p.is_online = 1";
      }

      sql += `
        ORDER BY
        p.availability_status DESC,
        p.average_rating DESC
      `;

      const [rows] = await conn.query(sql, values);
      return rows;
    } catch (error) {
      console.error("Error in searchProviders:", error.message);
      throw new Error(`Database error in searchProviders: ${error.message}`);
    }
  }

  /**
   * Log provider status transitions for audit.
   * @param {number} providerId 
   * @param {string|null} previousStatus 
   * @param {string} newStatus 
   * @param {number} changedBy 
   * @param {Object} [options]
   * @param {Object} [options.connection] - MySQL transaction connection
   * @returns {Promise<number>}
   */
  async createStatusLog(providerId, previousStatus, newStatus, changedBy, options = {}) {
    try {
      const conn = options.connection || db;
      const [result] = await conn.query(
        `INSERT INTO provider_status_logs (provider_id, previous_status, new_status, changed_by)
         VALUES (?, ?, ?, ?)`,
        [providerId, previousStatus || null, newStatus, changedBy]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error in createStatusLog:", error.message);
      throw new Error(`Database error in createStatusLog: ${error.message}`);
    }
  }
}

module.exports = new ProviderRepository();
