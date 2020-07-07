const { Types } = require('mongoose');
const User = require('../db/user');
const Auction = require('../db/auction');

const { wrap } = require('../middlewares');

const io = require('../app-socket');

exports.getAuctions = wrap(async (req, res) => {
  const { status, _id, applies, limit = NaN } = req.query;

  const aggregations = [];
  aggregations.push({
    $match: {
      status: {
        $nin: ['D'],
      },
    },
  });
  if (status) aggregations.push({ $match: { status } });

  const sort = {};
  if (_id) sort._id = _id === 'asc' ? 1 : -1;
  if (applies) sort.appliesLength = applies === 'asc' ? 1 : -1;
  if (Object.keys(sort)[0]) aggregation.push({ $sort: sort });

  const auctions = await Auction.aggregate([
    ...aggregations,
    { $limit: Math.max(Math.min(+limit, PetitionConf.listLimit), 1) || PetitionConf.listLimit },
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
        'user': 1,
        'title': 1,
        'image': 1,
        'currentPrice': 1,
        'appliesLength': 1,
      },
    },
  ]);

  res.json({ status: 200, auctions });
});

exports.getAuctionMe = wrap(async (req, res) => {
  const user = await User.findById(req.auth._id).lean();
  if (!user) {
    res.json({ status: 500, msg: 'Error occurred' });
    return;
  }

  const auctions = await Auction
    .find({ user: req.auth._id })
    .select(['_id', 'status'])
    .lean();

  res.json({ status: 200, auctions, auctionApplies: user.auctionApplies });
});

exports.findAuction = wrap(async (req, res) => {
  const auction = (await Auction.aggregate([
    { $match: Types.ObjectId(req.params.auctionId) },
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
        'user': 1,
        'title': 1,
        'image': 1,
        'productPrice': 1,
        'currentPrice': 1,
        'maxPrice': 1,
        'appliesLength': 1,
      },
    },
  ]))[0];

  if (!auction) {
    res.json({ status: 404, msg: '경매가 존재하지 않습니다.' });
    return;
  }
  res.json({ status: 200, auction });
});

exports.postAuction = wrap(async (req, res) => {
  // 한 사람당 진행 중인 경매는 하나만
  if (
    await Auction
      .find({ user: req.auth._id, status: 'P' })
      .select('_id')
      .limit(1)
      .lean()
  ) {
    res.status({ status: 409, msg: '이미 진행 중인 경매가 있습니다.' });
    return;
  }

  // 입력 값 확인
  const { title, image } = req.body;
  const productPrice = Math.floor(+req.body.productPrice);
  if (!title) {
    res.json({ status: 400, msg: 'title이 전달되지 않았습니다.' });
    return;
  }
  if (!image) {
    res.json({ status: 400, msg: 'image가 전달되지 않았습니다.' });
    return;
  }
  if (isNaN(productPrice) || productPrice < 0 || productPrice % 100) {
    res.json({ status: 400, msg: 'productPrice에 문제가 있습니다.' });
    return;
  }

  // 추가!
  const auction = await Auction.create({
    user: req.auth._id,
    title,
    image,
    productPrice,
    maxPrice: Math.floor(productPrice * 0.8 / 100) * 100,
  });

  res.json({ status: 200, auction });
});

exports.deleteAuction = wrap(async (req, res) => {
  // 경매 존재하는지 확인하고
  const auction = await Auction
    .findById({ _id: req.params.auctionId })
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
    { status: 'D' }, // $inc: {__v:1}
  ).lean();
  // 충돌확인
  console.log(result);
  if (!result) {
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
    .select(['_id', 'currentPrice', 'maxPrice', '__v'])
    .lean();
  if (!auction) {
    res.json({ status: 404 });
    return;
  }
  // 진행 중인지 확인
  if (auction.status !== 'p') {
    res.json({ status: 423, msg: '경매가 진행 중이 아닙니다.' });
    return;
  }

  // 가격이 타당한지 확인
  if (price <= auction.currentPrice || price > auction.maxPrice) {
    res.json({ status: 400 });
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
      $push: {
        status,
        applies: {
          user: req.auth._id,
          price,
        },
      },
      $inc: { appliesLength: 1 },
    },
  );
  // 충돌확인
  if (!result) {
    res.json({ status: 409 });
    return;
  }

  res.json({ status: 200 });
  io.to(`a${auction._id}`).emit('a', {
    status,
    price,
    user: req.auth._id,
  });
});
