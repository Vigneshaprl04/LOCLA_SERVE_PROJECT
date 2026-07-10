const express = require("express");

const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus
} = require("../controllers/complaintController");

const {
  protect,
  authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, authorize("user"), createComplaint);
router.get("/my", protect, authorize("user"), getMyComplaints);

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllComplaints
);

router.patch(
  "/admin/:complaintId/status",
  protect,
  authorize("admin"),
  updateComplaintStatus
);

module.exports = router;
