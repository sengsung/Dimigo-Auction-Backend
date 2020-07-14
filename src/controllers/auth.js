const User = require('../db/user');

const JWT = require('jsonwebtoken');

const CONF = require('../config');
const { wrap } = require('../middlewares');

const Dimi = require('../api/dimi');

exports.authorize = wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    res.json({ status: 400, msg: 'username이 전달되지 않았습니다.' });
    return;
  }
  if (!password) {
    res.json({ status: 400, msg: 'password가 전달되지 않았습니다.' });
    return;
  }

  // 유저 인증하고
  const identify = await Dimi.identify(username, password);
  if (!identify) {
    res.json({ status: 404, msg: '사용자가 존재하지 않습니다.' });
    return;
  }

  // 유저 타입 확인하고
  switch (identify.user_type) {
    case 'S':
      // case 'T':
      // case 'D':
      // case 'P':
      break;
    default:
      res.json({ status: 403 });
      return;
  }

  // 일단 학생만
  const student = await Dimi.getStudent(identify.username);
  if (!student) {
    res.json({ status: 500 });
    return;
  }

  // 유저 불러와서
  const user = await User.findOneAndUpdate(
    { _id: identify.id },
    {
      _id: identify.id,
      name: identify.name,
      serial: student.serial,
    },
    { upsert: true, setDefaultsOnInsert: true, new: true },
  );

  // 밴 상태인지 확인하고
  if (new Date(user.banned).getTime() > new Date().getTime()) {
    res.json({ status: 423, msg: '밴 상태인 사용자입니다.' });
    return;
  }

  // 완료
  const token = JWT.sign(
    {
      _id: user._id,
      manager: user.manager,
    },
    CONF.jwt.key,
    CONF.jwt.options,
  );

  res.cookie('Auction_Auth', token, { httpOnly: true });
  res.json({ status: 200 });
});

exports.revoke = wrap(async (req, res) => {
  res.cookie('Auction_Auth', '', { expires: new Date() });
  res.end();
});
