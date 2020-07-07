const { Router } = require('express');
const controller = require('../controllers/auctions');

const router = Router();

router.get('/', controller.getAuctions); // 경매 목록
router.get('/me', controller.getAuctionMe); // 내가 등록한 경매 목록
router.get('/:auctionId', controller.findAuction); // 특정 경매 정보

router.post('/', controller.postAuction); // 경매 생성
router.delete('/:auctionId', controller.deleteAuction); // 경매 삭제

router.post('/apply/:auctionId', controller.applyAuction); // 경매 참가

module.exports = router;
