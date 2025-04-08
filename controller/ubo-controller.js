const axios = require("axios");
const KarzaUBO = require("../models/KarzaUBO");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const UBO = module.exports;



UBO.search = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = {
      entityId: id,
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

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v1/ubo`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "UBO", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const uboData = response.data?.result || {};
    uboData.createdAt = Date.now();
    uboData.updatedAt = Date.now();

    // save data
    await KarzaUBO.findOneAndUpdate({ entityId: uboData.entityId || requestBody.entityId }, uboData, { upsert: true, new: true });

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

    const projection = {
      _id: 1,
      entityId: 1,
      createdAt: 1,
      updatedAt: 1,
      coverage: 1,
      createdAt: 1,
      entityName: 1,
      finYear: 1,
      isPartial: 1,
      totalEquityShares: 1,
    };

    const totalRecords = await KarzaUBO.countDocuments(query);
    const ubos = await KarzaUBO.find(query, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        ubos,
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
