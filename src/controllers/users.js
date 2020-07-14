const User = require('../db/user');

const { wrap } = require('../middlewares');

exports.me = wrap(async (req, res) => {
  const user = await User
    .findById(req.auth._id)
    .select(['_id', 'name', 'serial'])
    .lean();
  if (!user) {
    res.json({ status: 404 });
    return;
  }
  res.json({ status: 200, user });
});
