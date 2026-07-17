"use strict";

const db = require("../config/db");

/**
 * Executes a callback within a managed MySQL database transaction.
 * Handles begin, commit, rollback, and connection release lifecycle.
 * @param {Function} callback - Async function executing operations: callback(connection)
 * @returns {Promise<any>}
 */
async function runInTransaction(callback) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  runInTransaction
};
