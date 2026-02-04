const express = require('express');
const router = express.Router();
const {
    createRequest,
    getMyRequests,
    getRequestById,
    getAllRequests,
    updateRequestStatus,
    addRemark,
    rejectRequest,
    getRequestStats
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');

// Public/User routes
router.post('/', protect, createRequest);
router.get('/my-requests', protect, getMyRequests);
router.get('/:id', protect, getRequestById);

// Admin only routes
router.get('/', protect, authorize('admin'), getAllRequests);
router.get('/stats/overview', protect, authorize('admin'), getRequestStats);
router.patch('/:id/status', protect, authorize('admin'), updateRequestStatus);
router.post('/:id/remarks', protect, authorize('admin'), addRemark);
router.post('/:id/reject', protect, authorize('admin'), rejectRequest);

module.exports = router;
