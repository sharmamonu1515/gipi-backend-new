const axios = require("axios");
const KarzaBifrDetails = require("../models/KarzaBifrDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const BIFR = module.exports;



BIFR.search = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = {
      entityId: id
    };

    // check if company already exists
    const existingBIFR = await KarzaBifrDetails.findOne({ entityId: requestBody.entityId });

    if (existingBIFR) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingBIFR,
        message: "BIFR details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v1/defaulters/bifr`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "BIFR", responseTime, response.data.statusCode === 101 ? 'success' : 'failed',  requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error('Data not found.');
    }

    // Extract company details from API response
    const bifrData = response.data?.result || {};
    
    const data = {
        entityId: requestBody.entityId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: bifrData
    }

    // save data
    await KarzaBifrDetails.findOneAndUpdate({ entityId: bifrData.entityId }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "BIFR details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching BIFR data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

BIFR.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
                { entityId: { $regex: search, $options: "i" } }, 
                { "data.entityName": { $regex: search, $options: "i" } },
                { "data.caseNo": { $regex: search, $options: "i" } },
            ],
        }
      : {};

    const totalRecords = await KarzaBifrDetails.countDocuments(query);
    const bifr = await KarzaBifrDetails.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        bifr,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "BIFR list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching BIFR list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch BIFR list.",
    });
  }
};

BIFR.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "BIFR ID is required" });
    }

    const bifrDetails = await KarzaBifrDetails.findOne({ entityId: id });
    if (!bifrDetails) {
      return res.status(404).json({ success: false, message: "BIFR not found" });
    }

    return res.status(200).json({
      success: true,
      data: bifrDetails,
      message: "BIFR details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching BIFR details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch BIFR details." });
  }
};
