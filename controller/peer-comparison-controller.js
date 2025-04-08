const axios = require("axios");
const KarzaPeerComparison = require("../models/KarzaPeerComparison");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const PeerComparison = module.exports;



PeerComparison.search = async (req, res) => {
  try {

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = {
      cinKid: id,
    };

    // check if company already exists
    const existingComparison = await KarzaPeerComparison.findOne({ entityId: requestBody.id });

    if (existingComparison) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingComparison,
        message: "Peer Comparison details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v1/peer-details/search`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "Peer Comparison", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error('Data not found.');
    }

    // Extract company details from API response
    const peerComparisonData = response.data?.result?.records || {};

    const data = {
        entityId: requestBody.cinKid,
        data: peerComparisonData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    // save data
    await KarzaPeerComparison.findOneAndUpdate({ entityId: requestBody.cinKid }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "Peer Comparison details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparison data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

PeerComparison.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { "data.name": { $regex: search, $options: "i" } }, { "data.entityId": { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaPeerComparison.countDocuments(query);
    const peerComparisons = await KarzaPeerComparison.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        peerComparisons,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Peer Comparison list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparison list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Peer Comparison list.",
    });
  }
};

PeerComparison.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const peerComparison = await KarzaPeerComparison.findOne({ entityId: id });
    if (!peerComparison) {
      return res.status(404).json({ success: false, message: "Peer Comparison not found" });
    }

    return res.status(200).json({
      success: true,
      data: peerComparison,
      message: "Peer Comparison details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparison details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Peer Comparison details." });
  }
};
