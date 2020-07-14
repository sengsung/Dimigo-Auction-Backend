const { Types } = require('mongoose');
const multer = require('multer');
const { Router } = require('express');
const controller = require('../controllers/auctions');

const router = Router();

//multer 의 diskStorage를 정의
const storage = multer.diskStorage({
  destination : (req, file, cb) => {
    cb(null, `${__dirname}/../static/img/`);
  },
  filename : (req, file, cb) => {
    req.body.objectId = Types.ObjectId();
    cb(null, `${req.body.objectId}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    switch (file.mimetype) {
      case "image/jpg":
      case "image/jpeg":
      case "image/png":
      case "image/gif":
      case "image/bmp":
        cb(null, true);
        break;
      default:
        cb(null, false);
    }
  }
});

router.get('/', controller.getAuctions); // 경매 목록
router.get('/me', controller.getAuctionMe); // 내가 등록한 경매 목록
router.get('/:auctionId', controller.findAuction); // 특정 경매 정보

router.delete('/:auctionId',controller.deleteAuction); // 경매 삭제

router.post('/apply/:auctionId', controller.applyAuction); // 경매 참가

router.post('/', upload.single('image'), controller.postAuction); // 경매 생성

module.exports = router;
