const mongoose = require('mongoose');

const Userschema = new mongoose.Schema({
    name: {
        type: String
    },
    avatar: {
        type: String
    },
    points: {
        type: Number,
        default: 0
    },
    spentPoints: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('User', Userschema);