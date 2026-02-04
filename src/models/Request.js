const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
    status: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    performedByName: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const requestSchema = new mongoose.Schema({
    // User Reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Request Type
    requestType: {
        type: String,
        required: [true, 'Request type is required'],
        enum: [
            'degree_certificate',
            'provisional_certificate',
            'migration_certificate',
            'transcript',
            'marksheet',
            'name_correction',
            'dob_correction',
            'retotaling',
            'rechecking',
            'other'
        ]
    },

    // Request Details
    title: {
        type: String,
        required: [true, 'Request title is required']
    },
    description: {
        type: String,
        required: [true, 'Request description is required']
    },

    // Correction Details (for correction requests)
    correctionDetails: {
        currentValue: String,
        requestedValue: String,
        reason: String
    },

    // Documents
    uploadedDocuments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Status Management
    status: {
        type: String,
        enum: [
            'submitted',
            'under_review',
            'correction_required',
            'approved',
            'rejected',
            'in_processing',
            'ready',
            'completed'
        ],
        default: 'submitted'
    },

    // Admin Comments
    adminRemarks: [{
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        adminName: String,
        remark: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // Timeline
    timeline: [timelineEventSchema],

    // Priority
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },

    // Rejection Reason
    rejectionReason: String,

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Expected Completion Date
    expectedCompletionDate: Date,

    // Actual Completion Date
    completedAt: Date
});

// Add initial timeline event when request is created
requestSchema.pre('save', function (next) {
    if (this.isNew) {
        this.timeline.push({
            status: 'submitted',
            message: 'Request submitted successfully',
            timestamp: new Date()
        });
    }
    this.updatedAt = Date.now();
    next();
});

// Add index for faster queries
requestSchema.index({ userId: 1, status: 1 });
requestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);
