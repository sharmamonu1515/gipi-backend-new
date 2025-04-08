const axios = require("axios");
const KarzaDirectorDetails = require("../models/KarzaDirectorDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const DirectorDetails = module.exports;



DirectorDetails.search = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required.",
      });
    }

    const requestBody = { id };

    // check if company already exists
    const existingDetails = await KarzaDirectorDetails.findOne({ entityId: id });

    if (existingDetails) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingDetails,
        message: "Director Details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v3/din-details`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "Director Details", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const directorData = response.data?.result || {};

    // save data
    const savedDetails = await KarzaDirectorDetails.findOneAndUpdate(
      { entityId: id },
      {
        data: directorData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).send({
      success: true,
      data: savedDetails,
      message: "Director Details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Director Details data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

DirectorDetails.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }],
        }
      : {};

    const projection = {
      _id: 1,
      entityId: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const totalRecords = await KarzaDirectorDetails.countDocuments(query);
    const directorDetails = await KarzaDirectorDetails.find(query, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        directors: directorDetails,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Director Details list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Director Details list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Director Details list.",
    });
  }
};

DirectorDetails.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const directorDetails = await KarzaDirectorDetails.findOne({ _id: id });
    if (!directorDetails) {
      return res.status(404).json({ success: false, message: "Director Details not found" });
    }

    return res.status(200).json({
      success: true,
      data: directorDetails,
      message: "Director Details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Director Details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Director Details." });
  }
};
