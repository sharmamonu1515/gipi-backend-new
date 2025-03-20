const axios = require("axios");
const KarzaFinancialSummaryLLP = require("../models/KarzaFinancialSummaryLLP");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const FinancialSummaryLLP = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

FinancialSummaryLLP.search = async (req, res) => {
  try {
    const { id, financialYear } = req.body;

    if (!id || !financialYear || !Array.isArray(financialYear) || financialYear.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Entity Id and Financial Year are required, and Financial Year must be a non-empty array.",
      });
    }

    const requestBody = {
      entityId: id,
      consent: "Y",
      financialYear,
    };

    // check if company already exists
    const existingComparision = await KarzaFinancialSummaryLLP.findOne({ entityId: requestBody.id });

    if (existingComparision) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingComparision,
        message: "Financial Summary LLP details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post(`${Karza.API_BASE_URL}/v3/corp/docs/llpFinancialSummary`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": Karza.API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    await saveLog(USER_ID, "Financial Summary LLP", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

    const financialSummaryData = response.data?.result || {};
    financialSummaryData.createdAt = Date.now();
    financialSummaryData.updatedAt = Date.now();

    const data = {
      entityId: requestBody.entityId,
      ...financialSummaryData,
    };

    // save data
    await KarzaFinancialSummaryLLP.findOneAndUpdate({ entityId: requestBody.entityId }, data, { upsert: true, new: true });

    return res.status(200).send({
      success: true,
      data,
      message: "Financial Summary LLP details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Financial Summary LLP data:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

FinancialSummaryLLP.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { entityId: { $regex: search, $options: "i" } },
            { "companyInfo.entityEmailId": { $regex: search, $options: "i" } },
            { "companyInfo.entityName": { $regex: search, $options: "i" } },
            { "companyInfo.registrationDateOfCompany": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalRecords = await KarzaFinancialSummaryLLP.countDocuments(query);
    const financialSummaries = await KarzaFinancialSummaryLLP.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        financialSummaries,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Financial Summary LLP list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Financial Summary LLP list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Financial Summary LLP list.",
    });
  }
};

FinancialSummaryLLP.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const financialSummary = await KarzaFinancialSummaryLLP.findOne({ _id: id });
    if (!financialSummary) {
      return res.status(404).json({ success: false, message: "Financial Summary LLP not found" });
    }

    return res.status(200).json({
      success: true,
      data: financialSummary,
      message: "Financial Summary LLP details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Financial Summary LLP details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Financial Summary LLP details." });
  }
};
