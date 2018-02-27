const mongoose = require('mongoose');

let schema = {
  tag: { type: String, required: true },
  userName: { type: String, required: true },
  id: { type: Number, required: true },
  currentScheduleName: { type: String},
  currentScheduleChart: { type: String },
  historicSchedules: [
    {
      name: { type: String, required: true },
      adapted: { type: Boolean, required: true }
    }
  ],
  historicScheduleCharts: [
    {
      url: { type: String, required: true }
    }
  ],
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now}
};

module.exports = mongoose.model('User', schema);