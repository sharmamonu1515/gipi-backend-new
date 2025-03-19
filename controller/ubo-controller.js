const axios = require("axios");
const KarzaUBO = require("../models/KarzaUBO");
const saveLog = require("../lib/logHelper");
const UBO = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

UBO.search = async (req, res) => {
  try {
    const requestBody = {
      entityId: req.body.id || "",
      consent: "Y",
    };

    // check if company already exists
    const existingUBO = await KarzaUBO.findOne({ entityId: requestBody.id });

    if (existingUBO) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingUBO,
        message: "UBO details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post("https://api.karza.in/kscan/test/v1/ubo", requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": process.env.KARZA_API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    // Extract company details from API response
    const uboData = response.data?.result || {};
    uboData.createdAt = Date.now();
    uboData.updatedAt = Date.now();

    // save data
    await KarzaUBO.findOneAndUpdate({ entityId: uboData.entityId || requestBody.entityId }, uboData, { upsert: true, new: true });

    await saveLog(USER_ID, "UBO", responseTime, requestBody);

    return res.status(200).send({
      success: true,
      data: uboData,
      message: "UBO details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching UBO data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

UBO.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { entityName: { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaUBO.countDocuments(query);
    const companies = await KarzaUBO.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        companies,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "UBO list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching UBO list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch UBO list.",
    });
  }
};

UBO.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "UBO ID is required" });
    }

    const uboDetails = await KarzaUBO.findOne({ entityId: id });
    if (!uboDetails) {
      return res.status(404).json({ success: false, message: "UBO not found" });
    }

    return res.status(200).json({
      success: true,
      data: uboDetails,
      message: "UBO details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching UBO details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch UBO details." });
  }
};
