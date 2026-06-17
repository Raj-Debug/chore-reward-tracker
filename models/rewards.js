const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: -1 // -1 represents infinite stock
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reward', RewardSchema);
