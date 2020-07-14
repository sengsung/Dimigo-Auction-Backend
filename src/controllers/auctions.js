const { Types } = require('mongoose');
const fs = require('fs');

const User = require('../db/user');
const Auction = require('../db/auction');

const { wrap } = require('../middlewares');
const AuctionCONF = require('../config/auction');

const io = require('../app-socket');

exports.getAuctions = wrap(async (req, res) => {
  const { status, _id, applies, limit = NaN, page = NaN } = req.query;

  const aggregations = [];
  aggregations.push({
    $match: {
      status: {
        $nin: ['D'],
      },
      until: { $gt: new Date(new Date(new Date().toDateString()).getTime() - 259200000) },
    },
  });
  if (status) aggregations.push({ $match: { status } });

  const sort = {};
  if (_id) sort._id = _id === 'asc' ? 1 : -1;
  if (applies) sort.appliesLength = applies === 'asc' ? 1 : -1;
  if (Object.keys(sort)[0]) aggregation.push({ $sort: sort });

  const limit_ = Math.max(Math.min(+limit, AuctionCONF.listLimit), 1) || AuctionCONF.listLimit;
  const auctions = await Auction.aggregate([
    ...aggregations,
    { $skip: ((+page > 0 ? +page : 1) - 1) * limit_},
    { $limit: limit_ },
    {
      $project: {
        'status': 1,
        'title': 1,
        'until': 1,
        'currentPrice': 1,
        'maxPrice': 1,
      },
    },
  ]);

  res.json({ status: 200, auctions });
});

exports.getAuctionMe = wrap(async (req, res) => {
  const user = (await User.aggregate([
    { $match: { _id: req.auth._id } },
    { $unwind: '$auctionApplies' },
    {
      $lookup: {
        from: 'auctions',
        localField: 'auctionApplies',
        foreignField: '_id',
        as: 'auctionApplies'
      }
    },
    { $unwind: '$auctionApplies' },
    {
      $project: {
        'auctionApplies._id': 1,
        'auctionApplies.status': 1,
        'auctionApplies.title': 1,
      },
    },
    {
      $group: {
        _id: '$_id',
        auctionApplies: { $push: '$auctionApplies' },
      },
    },
  ]))[0];

  const auctions = await Auction
    .find({ user: req.auth._id })
    .select(['_id', 'title', 'status'])
    .sort({ _id: -1 })
    .lean();

  res.json({ status: 200, auctions, auctionApplies: user.auctionApplies });
});

exports.findAuction = wrap(async (req, res) => {
  const auction = (await Auction.aggregate([
    { $match: { _id: Types.ObjectId(req.params.auctionId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        'status': 1,
        'title': 1,
        'desc': 1,
        'productPrice': 1,
        'currentPrice': 1,
        'maxPrice': 1,
        'appliesLength': 1,
        'lastUser': { $slice: [ '$applies', -1 ] },
        'user.serial': 1,
        'user.name': 1,
      },
    },
  ]))[0];

  if (!auction) {
    res.json({ status: 404, msg: '경매가 존재하지 않습니다.' });
    return;
  }

  if (auction.lastUser[0]) {
    auction.lastUser = await User
      .findById(auction.lastUser[0].user)
      .select(['_id', 'name', 'serial'])
      .lean();
  }
  res.json({ status: 200, auction });
});

exports.postAuction = wrap(async (req, res) => {
  // 한 사람당 진행 중인 경매는 하나만
  if (
    (await Auction
      .find({ user: req.auth._id, status: 'P' })
      .select('_id')
      .limit(1)
      .lean())[0]
  ) {
    res.json({ status: 409, msg: '이미 진행 중인 경매가 있습니다.' });
    if (req.file) {
      fs.unlink(`${__dirname}/../static/img/${req.body.objectId}`, () => {});
    }
    return;
  }

  // 입력 값 확인
  const { title, desc, price } = req.body;
  const productPrice = Math.floor(+price);
  if (!title || !desc) {
    res.json({ status: 400, msg: '전달되지 않은 값이 있습니다.' });
    if (req.file) {
      fs.unlink(`${__dirname}/../static/img/${req.body.objectId}`);
    }
    return;
  }
  if (
    isNaN(productPrice) ||
    productPrice < AuctionCONF.auctionMinPrice ||
    productPrice > AuctionCONF.auctionMaxPrice||
    productPrice % 100
  ) {
    res.json({ status: 400, msg: 'productPrice에 문제가 있습니다.' });
    if (req.file) {
      fs.unlink(`${__dirname}/../static/img/${req.body.objectId}`);
    }
    return;
  }

  // 추가!
  const auction = await Auction.create({
    _id: req.body.objectId,
    user: req.auth._id,
    title,
    desc,
    productPrice,
    until: new Date(new Date(new Date().toDateString()).getTime() + 1209600000),
    maxPrice: Math.floor(productPrice * 0.8 / 100) * 100,
  });

  res.json({ status: 200, auctionId: auction._id });
});

exports.deleteAuction = wrap(async (req, res) => {
  // 경매 존재하는지 확인하고
  const auction = await Auction
    .findOne({ _id: req.params.auctionId, status: { $nin: ['D'] } })
    .select(['_id', 'user', 'appliesLength', '__v'])
    .lean();
  if (!auction) {
    res.json({ status: 404, msg: '존재하지 않는 경매입니다.' });
    return;
  }
  // 내거 맞는지 확인하고
  if (auction.user !== req.auth._id) {
    res.json({ status: 403 });
    return;
  }
  // 이미 누가 경매 진행했으면 삭제 불가
  if (auction.appliesLength) {
    res.json({ status: 423 });
    return;
  }

  // 끝
  const result = await Auction.updateOne(
    {
      _id: auction._id,
      __v: auction.__v,
    },
    { status: 'D', $inc: { __v: 1 } }, 
  ).lean();
  // 충돌확인
  if (!result.n) {
    res.json({ status: 409, msg: '다시 시도해주세요' });
    return;
  }

  res.json({ status: 200 });
});

exports.applyAuction = wrap(async (req, res) => {
  // 가격이 정상적인 범위에 있는 숫자인지 확인
  const price = Math.floor(+req.body.price);
  if (price % 100) {
    res.json({ status: 400, msg: '가격에 문제가 있습니다.' });
    return;
  }

  // 경매가 존재하는지 확인
  const auction = await Auction
    .findOne({ _id: req.params.auctionId })
    .select(['_id', 'user', 'status', 'currentPrice', 'maxPrice', '__v'])
    .lean();
  if (!auction) {
    res.json({ status: 404 });
    return;
  }
  // 진행 중인지 확인
  if (auction.status !== 'P') {
    res.json({ status: 423 });
    return;
  }

  // 가격이 타당한지 확인
  if (price <= auction.currentPrice || price > auction.maxPrice) {
    res.json({ status: 400 });
    return;
  }

  // 본인건지 확인
  if (auction.user === req.auth._id) {
    res.json({ status: 403 });
    return;
  }

  // 업뎃!
  const status = price === auction.maxPrice ? 'C' : 'P';
  const result = await Auction.updateOne(
    {
      _id: auction._id,
      __v: auction.__v,
    },
    {
      currentPrice: price,
      status,
      $push: {
        applies: {
          user: req.auth._id,
          price,
        },
      },
      $inc: { appliesLength: 1 },
    },
  ).lean();
  // 충돌확인
  if (!result) {
    res.json({ status: 409 });
    return;
  }

  res.json({ status: 200 });

  io.to(`a${auction._id}`).emit('a', {
    _id: auction._id,
    status,
    price,
    user: req.auth._id,
  });

  User.updateOne(
    {
      _id: req.auth._id,
      auctionApplies: { $nin: [auction._id] },
    },
    {
      $push: { 
        auctionApplies: {
          $each: [auction._id],
          $position: 0,
        },
      },
    },
  ).exec();
});
