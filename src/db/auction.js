const { model, Schema } = require('mongoose');

const CONF = require('../config/auction');

const AuctionApplySchema = new Schema(
  {
    user: { type: Number, required: true }, // 참여자
    price: { type: Number, required: true }, // 부른 가격
    createdAt: { type: Date, default: new Date(), required: true },
  }
);

const AuctionSchema = new Schema(
  {
    status: { type: String, default: 'P', required: true }, // 상태; P: 진행중, C: 완료, D: 삭제됨
    user: { type: Number, required: true }, // 게시자
    title: { type: String, required: true }, // 상품명
    image: { type: String, required: true }, // 상품사진 url
    productPrice: { type: Number, required: true }, // 정가
    currentPrice: {
      type: Number, default: CONF.auctionMinPrice, required: true
    }, // 현재 가격
    maxPrice: { type: Number, required: true },
    applies: { type: [AuctionApplySchema], default: [], required: true },
    appliesLength: { type: Number, default: 0, required: true },
    until: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model('auction', AuctionSchema);
