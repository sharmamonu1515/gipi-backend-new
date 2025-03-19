const axios = require("axios");
const KarzaCompanyDetail = require("../models/KarzaCompanyDetail");
const saveLog = require("../lib/logHelper");
const Entity = module.exports;

// ! hardcoded must be setup properly
const USER_ID = "634ac9e31deb4cd28a4adde9";

Entity.search = async (req, res) => {
  try {
    const requestBody = {
      id: req.body.id || "",
    };

    // check if company already exists
    const existingCompany = await KarzaCompanyDetail.findOne({ entityId: requestBody.id });

    if (existingCompany) {
      console.log("Returning data from MongoDB database.");
      return res.status(200).send({
        success: true,
        data: existingCompany,
        message: "Company details fetched successfully.",
      });
    }

    const startTime = Date.now();

    const response = await axios.post("https://beta.kscan.in/v3/search/byIdOrName", requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": process.env.KARZA_API_KEY,
      },
    });

    const responseTime = Date.now() - startTime;

    // Extract company details from API response
    const companyData = response.data?.result?.map((company) => ({
      entityId: company.entityId,
      name: company.name,
      basicDetails: company,
      detailedDetails: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    // save data
    await Promise.all(
      companyData.map(async (company) => {
        await KarzaCompanyDetail.findOneAndUpdate({ entityId: company.entityId }, company, { upsert: true, new: true });
      })
    );

    await saveLog(USER_ID, "Entity Search", responseTime, requestBody);

    return res.status(200).send({
      success: true,
      data: companyData,
      message: "Company details fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Company data:", error);
    return res.status(200).send({
      success: false,
      message: "Failed to fetch data.",
    });
  }
};

Entity.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { entityId: { $regex: search, $options: "i" } },
            { "basicDetails.name": { $regex: search, $options: "i" } },
            { "basicDetails.primaryName": { $regex: search, $options: "i" } },
            { "basicDetails.secondaryName": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalRecords = await KarzaCompanyDetail.countDocuments(query);
    const companies = await KarzaCompanyDetail.find(query)
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
      message: "Company list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching company list:", error);
    return res.status(200).send({
      success: false,
      message: "Failed to fetch company list.",
    });
  }
};
