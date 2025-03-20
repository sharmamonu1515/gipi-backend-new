const axios = require("axios");
const KarzaAssetsUnderAuction = require("../models/KarzaAssetsUnderAuction");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const AssetsUnderAuction = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

AssetsUnderAuction.search = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = {
      id: id,
    };

    // check if company already exists
    const existingAssets = await KarzaAssetsUnderAuction.findOne({ entityId: requestBody.id });

    if (existingAssets) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingAssets,
        message: "Assets Under Auction fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${Karza.API_BASE_URL}/v3/bank-auction`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": Karza.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;
    
    await saveLog(USER_ID, "Assets Under Auction", responseTime, response.data.statusCode === 101 ? 'success' : 'failed',  requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const assetsData = response.data?.result || {};

    const data = {
      entityId: requestBody.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: assetsData,
    };

    // save data
    await KarzaAssetsUnderAuction.findOneAndUpdate({ entityId: assetsData.entityId }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "Assets Under Auction fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching BIFR data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

AssetsUnderAuction.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { entityId: { $regex: search, $options: "i" } },
            { "data.auctionType": { $regex: search, $options: "i" } },
            { "data.auctionTitle": { $regex: search, $options: "i" } },
            { "data.natureOfPossession": { $regex: search, $options: "i" } },
            { "data.assetName": { $regex: search, $options: "i" } },
            { "data.assetCity": { $regex: search, $options: "i" } },
            { "data.assetCategory": { $regex: search, $options: "i" } },
            { "data.lenderCity": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalRecords = await KarzaAssetsUnderAuction.countDocuments(query);
    const assetsUnderAuction = await KarzaAssetsUnderAuction.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        assetsUnderAuction,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Assets Under Auction list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Assets Under Auction list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Assets Under Auction list.",
    });
  }
};

AssetsUnderAuction.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const assetsUnderAuction = await KarzaAssetsUnderAuction.findOne({ entityId: id });
    if (!assetsUnderAuction) {
      return res.status(404).json({ success: false, message: "Bank defaulter not found" });
    }

    return res.status(200).json({
      success: true,
      data: assetsUnderAuction,
      message: "Assets Under Auction fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Assets Under Auction:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Assets Under Auction." });
  }
};
