const axios = require("axios");
const KarzaCompanyDetail = require("../models/KarzaCompanyDetail");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const LitigationBI = require("./litigation-bi-controller");
const Entity = module.exports;


Entity.search = async (req, res) => {
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

    const response = await axios.post(`${await Karza.getBetaBaseURL()}/v3/search/byIdOrName`, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "x-karza-key": await Karza.getAPIKey(),
      },
    });

    const responseTime = Date.now() - startTime;
    await saveLog(req.user?._id, "Entity Search", responseTime, response.data.statusCode === 101 ? "success" : "failed", requestBody);

    if (response.data.statusCode !== 101) {
      throw new Error("Data not found.");
    }

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

Entity.searchByNameOrId = async (req, res) => {
  try {
    const reqData = {
      id: /\d/.test(req.body.name) ? req.body.name : undefined,
      filter: {
        name: req.body.name,
      },
      nameMatch: false,
      entitySearch: true,
      temporaryKid: false,
      section: "search",
    };

    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getSearchURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify(reqData),
    };

    const response = await axios.request(config);

    return res.send(response.data);
  } catch (error) {
    console.error("Error in searchByNameOrId:", error.message);
    return res.send({ status: "error", message: error.message });
  }
};
