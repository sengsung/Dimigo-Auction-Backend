const { model, Schema } = require('mongoose');

const userSchema = new Schema(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true },
    serial: { type: String, required: true },
    banned: { type: Date || null, default: null },
    manager: { type: Boolean, default: false, required: true },
    auctionApplies: { type: [Schema.Types.ObjectId], default: [], required: true },
  },
  { versionKey: false },
);

module.exports = model('user', userSchema);
