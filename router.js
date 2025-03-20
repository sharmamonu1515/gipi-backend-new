const express = require('express');
const Entity =  require('./controller/entity-controller');
const UBO =  require('./controller/ubo-controller');
const SBO =  require('./controller/sbo-controller');
const BasicUdyamDetails =  require('./controller/basic-udyam-details-controller');
const PeerComparision =  require('./controller/peer-comparision-controller');
const ConsolidatedCompanyInformation = require('./controller/consolidated-company-information-controller');
const FinancialSummaryLLP = require('./controller/financial-summary-llp-controller');
const IBBI = require('./controller/ibbi-details-controller');
const BIFR = require('./controller/bifr-details-controller');
const BankDefaulters = require('./controller/bank-defaulters-controller');
const AssetsUnderAuction = require('./controller/assets-under-auction-controller');
const LitigationBI = require('./controller/litigation-bi-controller');
const router = express.Router();

// Entity Endpoints
router.post('/entity/search', Entity.search);
router.get('/entity/list', Entity.getList);

// UBO Endpoints
router.post('/ubo/search', UBO.search);
router.get('/ubo/list', UBO.getList);
router.get('/ubo/:id', UBO.getById);

// SBO Endpoints
router.post('/sbo/search', SBO.search);
router.get('/sbo/list', SBO.getList);
router.get('/sbo/:id', SBO.getById);

// Basic Udyam Details
router.post('/basic-udyam-details/search', BasicUdyamDetails.search);
router.get('/basic-udyam-details/list', BasicUdyamDetails.getList);
router.get('/basic-udyam-details/:id', BasicUdyamDetails.getById);

// Peer comparision
router.post('/peer-comparision/search', PeerComparision.search);
router.get('/peer-comparision/list', PeerComparision.getList);
router.get('/peer-comparision/:id', PeerComparision.getById);

// Consolidated Company information
router.post('/consolidated-company-information/search', ConsolidatedCompanyInformation.search);
router.get('/consolidated-company-information/list', ConsolidatedCompanyInformation.getList);
router.get('/consolidated-company-information/:id', ConsolidatedCompanyInformation.getById);

// Financial Summary LLP
router.post('/financial-summary-llp/search', FinancialSummaryLLP.search);
router.get('/financial-summary-llp/list', FinancialSummaryLLP.getList);
router.get('/financial-summary-llp/:id', FinancialSummaryLLP.getById);

// IBBI
router.post('/ibbi/search', IBBI.search);
router.get('/ibbi/list', IBBI.getList);
router.get('/ibbi/:id', IBBI.getById);

// BIFR
router.post('/bifr/search', BIFR.search);
router.get('/bifr/list', BIFR.getList);
router.get('/bifr/:id', BIFR.getById);

// Bank Defaulters
router.post('/bank-defaulters/search', BankDefaulters.search);
router.get('/bank-defaulters/list', BankDefaulters.getList);
router.get('/bank-defaulters/:id', BankDefaulters.getById);

// Assets Under Auction
router.post('/assets-under-auction/search', AssetsUnderAuction.search);
router.get('/assets-under-auction/list', AssetsUnderAuction.getList);
router.get('/assets-under-auction/:id', AssetsUnderAuction.getById);

// Litigation BI
router.post('/litigation-bi/search', LitigationBI.search);

module.exports = router;