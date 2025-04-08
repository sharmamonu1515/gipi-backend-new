const axios = require("axios");
const KarzaBasicUdyamDetails = require("../models/KarzaBasicUdyamDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const BasicUdyamDetails = module.exports;



BasicUdyamDetails.search = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = {
      id,
      // "name": "",
      // "email": "",
      // "contact": "",
      // "address": "",
      // "dateOfIncorporation": "",
      // "dateOfRegistration": "",
      // "dateOfCommencement": ""
    };

    // check if company already exists
    const existingUdyamDetails = await KarzaBasicUdyamDetails.findOne({ entityId: requestBody.id });

    if (existingUdyamDetails) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingUdyamDetails,
        message: "Basic udyam details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v3/pan-udyam`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "Basic Udyam Details", responseTime, response.data.statusCode === 101 ? 'success' : 'failed',  requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error('Data not found.');
    }

    // Extract company details from API response
    const udyamData = response.data?.result || {};
    udyamData.createdAt = Date.now();
    udyamData.updatedAt = Date.now();

    const data = {
      entityId: requestBody.id,
      data: udyamData,
    };

    // save data
    await KarzaBasicUdyamDetails.findOneAndUpdate(
      { entityId: requestBody.entityId },
      data,
      { upsert: true, new: true }
    );

    return res.status(200).send({
      success: true,
      data,
      message: "Basic udyam details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching basic udyam details data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

BasicUdyamDetails.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { "data.urn": { $regex: search, $options: "i" } }, { "data.name": { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaBasicUdyamDetails.countDocuments(query);
    const udyamDetails = await KarzaBasicUdyamDetails.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        udyamDetails,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Basic udyam details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Basic udyam details list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Basic udyam details list.",
    });
  }
};

BasicUdyamDetails.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Entity ID is required" });
    }

    const basicUdyamDetails = await KarzaBasicUdyamDetails.findOne({ entityId: id });
    if (!basicUdyamDetails) {
      return res.status(404).json({ success: false, message: "Basic udyam details not found" });
    }

    return res.status(200).json({
      success: true,
      data: basicUdyamDetails,
      message: "Basic udyam details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching UBO details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Basic udyam details." });
  }
};
