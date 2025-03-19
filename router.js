const express = require('express');
const Entity =  require('./controller/entity-controller');
const UBO =  require('./controller/ubo-controller');
const router = express.Router();

// Entity Endpoints
router.post('/entity/search', Entity.search);
router.get('/entity/list', Entity.getList);

// UBO Endpoints
router.post('/ubo/search', UBO.search);
router.get('/ubo/list', UBO.getList);
router.get('/ubo/:id', UBO.getById);

module.exports = router;