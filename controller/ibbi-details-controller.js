const axios = require("axios");
const KarzaIbbiDetails = require("../models/KarzaIbbiDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const IBBI = module.exports;



IBBI.search = async (req, res) => {
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
    };

    // check if company already exists
    const existingIBBI = await KarzaIbbiDetails.findOne({ entityId: requestBody.id });

    if (existingIBBI) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingIBBI,
        message: "IBBI details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v3/ibbi-details`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "IBBI", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const ibbiData = response.data?.result || {};

    const data = {
      entityId: requestBody.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: ibbiData,
    };

    // save data
    await KarzaIbbiDetails.findOneAndUpdate({ entityId: data.entityId }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "IBBI details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching IBBI data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

IBBI.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { entityId: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { announcementType: { $regex: search, $options: "i" } },
            { resolutionProfessionalName: { $regex: search, $options: "i" } },
            { applicantName: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalRecords = await KarzaIbbiDetails.countDocuments(query);
    const ibbi = await KarzaIbbiDetails.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        ibbi,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "IBBI list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching IBBI list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch IBBI list.",
    });
  }
};

IBBI.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "IBBI ID is required" });
    }

    const ibbiDetails = await KarzaIbbiDetails.findOne({ entityId: id });
    if (!ibbiDetails) {
      return res.status(404).json({ success: false, message: "IBBI not found" });
    }

    return res.status(200).json({
      success: true,
      data: ibbiDetails,
      message: "IBBI details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching IBBI details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch IBBI details." });
  }
};
