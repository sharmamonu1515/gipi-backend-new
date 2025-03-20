const axios = require("axios");
const KarzaConsolidatedCompanyInformation = require("../models/KarzaConsolidatedCompanyInformation");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const ConsolidatedCompanyInformation = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

ConsolidatedCompanyInformation.search = async (req, res) => {
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
      consent: "y",
      //   "docType": [
      //     "alerts",
      //     "auditorProfile",
      //     "chargeDetails",
      //     "consolidatedFinancial",
      //     "financial",
      //     "financialSummary",
      //     "shareHolders",
      //     "shareHoldingPattern",
      //     "ubo"
      //   ],
      //   "financialYear": [
      //     "2017-18"
      //   ],
      //   "periodFrom": "2013",
      //   "periodTo": "2018",
    };

    // check if company already exists
    const existingCompanyDetails = await KarzaConsolidatedCompanyInformation.findOne({ entityId: requestBody.id });

    if (existingCompanyDetails) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingCompanyDetails,
        message: "Consolidated Company Information fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${Karza.API_BASE_URL}/v1/corp/docs/details`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": Karza.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(USER_ID, "Consolidated Company Information", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    // Extract company details from API response
    const companyData = response.data?.result || {};
    companyData.createdAt = Date.now();
    companyData.updatedAt = Date.now();

    // save data
    await KarzaConsolidatedCompanyInformation.findOneAndUpdate({ entityId: requestBody.entityId }, companyData, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data: companyData,
      message: "Consolidated Company Information fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Consolidated Company Information data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

ConsolidatedCompanyInformation.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { companyName: { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaConsolidatedCompanyInformation.countDocuments(query);
    const companyDetails = await KarzaConsolidatedCompanyInformation.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        companyDetails,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Consolidated Company Information fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Consolidated Company Information list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Consolidated Company Information list.",
    });
  }
};

ConsolidatedCompanyInformation.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Entity ID is required" });
    }

    const ConsolidatedCompanyInformation = await KarzaConsolidatedCompanyInformation.findOne({ entityId: id });
    if (!ConsolidatedCompanyInformation) {
      return res.status(404).json({ success: false, message: "Consolidated Company Information not found" });
    }

    return res.status(200).json({
      success: true,
      data: ConsolidatedCompanyInformation,
      message: "Consolidated Company Information fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching UBO details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Consolidated Company Information." });
  }
};
