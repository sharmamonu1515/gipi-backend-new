const axios = require("axios");
const KarzaAMLSanctionsScreening = require("../models/KarzaAMLSanctionsScreening");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const AMLSanctions = module.exports;

AMLSanctions.search = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    const requestBody = {
      name: name,
    };

    // check if company already exists
    const existingAML = await KarzaAMLSanctionsScreening.findOne({ name: requestBody.name });

    if (existingAML) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingAML,
        message: "AML Sanctions Screening fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${await Karza.getAPIBaseURL()}/v3.2/search/aml`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(req.user?._id, "AML Sanctions Screening", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const amlData = response.data?.result || {};

    // save data
    const savedAml = await KarzaAMLSanctionsScreening.findOneAndUpdate({ name: name }, { amlData: amlData, createdAt: Date.now(), updatedAt: Date.now() }, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data: savedAml,
      message: "AML Sanctions Screening fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching AML data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

AMLSanctions.getList = async (req, res) => {
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

    const totalRecords = await KarzaAMLSanctionsScreening.countDocuments(query);
    const amlList = await KarzaAMLSanctionsScreening.find(query, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        amls: amlList,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "AML list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching AML list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch AML list.",
    });
  }
};

AMLSanctions.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "AML ID is required" });
    }

    const amlDetails = await KarzaAMLSanctionsScreening.findOne({ _id: id });
    if (!amlDetails) {
      return res.status(404).json({ success: false, message: "AML not found" });
    }

    return res.status(200).json({
      success: true,
      data: amlDetails,
      message: "AML Sanctions Screening fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching AML Sanctions Screening:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch AML Sanctions Screening." });
  }
};
