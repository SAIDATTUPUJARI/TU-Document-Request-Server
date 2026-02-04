const Request = require('../models/Request');
const User = require('../models/User');

// @desc    Create new request
// @route   POST /api/requests
// @access  Private
exports.createRequest = async (req, res, next) => {
    try {
        const {
            requestType,
            title,
            description,
            correctionDetails,
            uploadedDocuments,
            priority
        } = req.body;

        const request = await Request.create({
            userId: req.user.id,
            requestType,
            title,
            description,
            correctionDetails,
            uploadedDocuments,
            priority: priority || 'medium'
        });

        res.status(201).json({
            success: true,
            message: 'Request submitted successfully',
            request
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all requests for logged in user
// @route   GET /api/requests/my-requests
// @access  Private
exports.getMyRequests = async (req, res, next) => {
    try {
        const requests = await Request.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single request by ID
// @route   GET /api/requests/:id
// @access  Private
exports.getRequestById = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('userId', 'firstName lastName email studentId');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Check ownership or admin role
        if (request.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this request'
            });
        }

        res.status(200).json({
            success: true,
            request
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all requests (Admin only)
// @route   GET /api/requests
// @access  Private/Admin
exports.getAllRequests = async (req, res, next) => {
    try {
        const { status, requestType, priority, search } = req.query;

        let query = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by request type
        if (requestType) {
            query.requestType = requestType;
        }

        // Filter by priority
        if (priority) {
            query.priority = priority;
        }

        // Search by title or description
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const requests = await Request.find(query)
            .populate('userId', 'firstName lastName email studentId')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update request status (Admin only)
// @route   PATCH /api/requests/:id/status
// @access  Private/Admin
exports.updateRequestStatus = async (req, res, next) => {
    try {
        const { status, message } = req.body;

        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Update status
        request.status = status;

        // Add timeline event
        request.timeline.push({
            status,
            message: message || `Status updated to ${status}`,
            performedBy: req.user.id,
            performedByName: `${req.user.firstName} ${req.user.lastName}`
        });

        // Set completion date if completed
        if (status === 'completed') {
            request.completedAt = new Date();
        }

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Request status updated successfully',
            request
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add admin remark to request
// @route   POST /api/requests/:id/remarks
// @access  Private/Admin
exports.addRemark = async (req, res, next) => {
    try {
        const { remark } = req.body;

        if (!remark) {
            return res.status(400).json({
                success: false,
                message: 'Remark is required'
            });
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        // Add remark
        request.adminRemarks.push({
            admin: req.user.id,
            adminName: `${req.user.firstName} ${req.user.lastName}`,
            remark
        });

        // Add to timeline
        request.timeline.push({
            status: request.status,
            message: `Admin added a remark: ${remark}`,
            performedBy: req.user.id,
            performedByName: `${req.user.firstName} ${req.user.lastName}`
        });

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Remark added successfully',
            request
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Reject request
// @route   POST /api/requests/:id/reject
// @access  Private/Admin
exports.rejectRequest = async (req, res, next) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        request.status = 'rejected';
        request.rejectionReason = reason;

        request.timeline.push({
            status: 'rejected',
            message: `Request rejected: ${reason}`,
            performedBy: req.user.id,
            performedByName: `${req.user.firstName} ${req.user.lastName}`
        });

        await request.save();

        res.status(200).json({
            success: true,
            message: 'Request rejected successfully',
            request
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get request statistics (Admin only)
// @route   GET /api/requests/stats
// @access  Private/Admin
exports.getRequestStats = async (req, res, next) => {
    try {
        const stats = await Request.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalRequests = await Request.countDocuments();

        const formattedStats = {
            total: totalRequests,
            byStatus: {}
        };

        stats.forEach(stat => {
            formattedStats.byStatus[stat._id] = stat.count;
        });

        res.status(200).json({
            success: true,
            stats: formattedStats
        });
    } catch (error) {
        next(error);
    }
};
