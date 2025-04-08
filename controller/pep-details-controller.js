const axios = require("axios");
const KarzaPEPDetail = require("../models/KarzaPEPDetail");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const PEPDetail = module.exports;



PEPDetail.search = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    const requestBody = { name };

    // check if company already exists
    const existingPEP = await KarzaPEPDetail.findOne({ name: requestBody.name });

    if (existingPEP) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingPEP,
        message: "PEP details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v3/pep/details`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "PEP", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const pepData = response.data?.result || {};
    pepData.createdAt = Date.now();
    pepData.updatedAt = Date.now();

    // save data
    const savedPep = await KarzaPEPDetail.findOneAndUpdate({ name: name }, pepData, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data: savedPep,
      message: "PEP details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching PEP data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

PEPDetail.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ name: { $regex: search, $options: "i" } }],
        }
      : {};

    const projection = {
      _id: 1,
      name: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const totalRecords = await KarzaPEPDetail.countDocuments(query);
    const pepList = await KarzaPEPDetail.find(query, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        peps: pepList,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "PEP list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching PEP list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch PEP list.",
    });
  }
};

PEPDetail.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "PEP ID is required" });
    }

    const pepDetails = await KarzaPEPDetail.findOne({ _id: id });
    if (!pepDetails) {
      return res.status(404).json({ success: false, message: "PEP not found" });
    }

    return res.status(200).json({
      success: true,
      data: pepDetails,
      message: "PEP details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching PEP details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch PEP details." });
  }
};
