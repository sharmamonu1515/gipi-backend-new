const axios = require("axios");
const KarzaPeerComparision = require("../models/KarzaPeerComparision");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const PeerComparision = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

PeerComparision.search = async (req, res) => {
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
    const existingComparision = await KarzaPeerComparision.findOne({ entityId: requestBody.id });

    if (existingComparision) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingComparision,
        message: "Peer Comparision details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${Karza.API_BASE_URL}/v1/peer-details/search`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": Karza.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(USER_ID, "Peer Comparision", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error('Data not found.');
    }

    // Extract company details from API response
    const peerComparisionData = response.data?.result?.records || {};
    peerComparisionData.createdAt = Date.now();
    peerComparisionData.updatedAt = Date.now();

    const data = {
        entityId: requestBody.cinKid,
        data: peerComparisionData,
    };

    // save data
    await KarzaPeerComparision.findOneAndUpdate({ entityId: requestBody.cinKid }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "Peer Comparision details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparision data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

PeerComparision.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { "data.name": { $regex: search, $options: "i" } }, { "data.entityId": { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaPeerComparision.countDocuments(query);
    const peerComparisions = await KarzaPeerComparision.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        peerComparisions,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Peer Comparision list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparision list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Peer Comparision list.",
    });
  }
};

PeerComparision.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const peerComparision = await KarzaPeerComparision.findOne({ entityId: id });
    if (!peerComparision) {
      return res.status(404).json({ success: false, message: "Peer Comparision not found" });
    }

    return res.status(200).json({
      success: true,
      data: peerComparision,
      message: "Peer Comparision details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Peer Comparision details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Peer Comparision details." });
  }
};
