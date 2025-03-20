const axios = require("axios");
const KarzaBankDefaulters = require("../models/KarzaBankDefaulters");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const BankDefaulters = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

BankDefaulters.search = async (req, res) => {
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
      // "directorName": "B.H. Antia",
      // "nameMatch": true,
      // "nameMatchThreshold": false
    };

    // check if company already exists
    const existingDefaulter = await KarzaBankDefaulters.findOne({ entityId: requestBody.id });

    if (existingDefaulter) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingDefaulter,
        message: "Bank defaulters fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${Karza.API_BASE_URL}/v3/bank-defaulter`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": Karza.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(USER_ID, "Bank Defaulters", responseTime, response.data.statusCode === 101 ? 'success' : 'failed',  requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const defaulterData = response.data?.result || {};

    const data = {
      entityId: requestBody.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: defaulterData,
    };

    // save data
    await KarzaBankDefaulters.findOneAndUpdate({ entityId: defaulterData.entityId }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "Bank defaulters fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching BIFR data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

BankDefaulters.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { "data.borrower": { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaBankDefaulters.countDocuments(query);
    const bifr = await KarzaBankDefaulters.find(query)
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
      message: "Bank defaulters list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Bank defaulters list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Bank defaulters list.",
    });
  }
};

BankDefaulters.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const defaulterDetails = await KarzaBankDefaulters.findOne({ entityId: id });
    if (!defaulterDetails) {
      return res.status(404).json({ success: false, message: "Bank defaulter not found" });
    }

    return res.status(200).json({
      success: true,
      data: defaulterDetails,
      message: "Bank defaulters fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Bank defaulters:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Bank defaulters." });
  }
};
