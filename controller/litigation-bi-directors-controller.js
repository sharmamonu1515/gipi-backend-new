const KarzaLitigationBiDetails = require("../models/KarzaLitigationBiDetails");
const KarzaLitigationBiDirectors = require("../models/KarzaLitigationBiDirectors");
const axios = require("axios");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const LitigationBI = require("./litigation-bi-controller");
const LitigationBIDirectors = module.exports;



// Get Company Details by Karza ID
LitigationBIDirectors.getCompanyDetailsByKid = async (req, res) => {
  try {
    const startTime = Date.now();
    
    const { kid, litigationBiId } = req.body;

    if (!kid && !litigationBiId) {
      return res.status(400).json({
        success: false,
        message: "Either KID or Litigation BI ID is required.",
      });
    }

    let resolvedKid = kid;

    // If litigationBiId is provided, fetch the kid from KarzaLitigationBiDetails
    if (litigationBiId) {
      const foundLitigationDetails = await KarzaLitigationBiDetails.findById(litigationBiId);
      if (!foundLitigationDetails) {
        return res.status(404).json({
          success: false,
          message: "Litigation BI Details not found for the provided ID.",
        });
      }
      resolvedKid = foundLitigationDetails.kid;
    }

    const query = { entityId: resolvedKid };
    if (litigationBiId) {
      query.litigationBiId = litigationBiId;
    }

    // Check if the company details exist in MongoDB
    const companyDetails = await KarzaLitigationBiDirectors.findOne(query);

    if (companyDetails) {
      console.log("MCA details fetched from DB");
      return res.status(200).json({
        success: true,
        data: companyDetails,
        message: "MCA details fetched successfully.",
      });
    }

    // Fetch details from Karza API
    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getCompanyDetailsURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify({ id: resolvedKid }),
    };

    const response = await axios.request(config);
    
    const responseTime = Date.now() - startTime;
    
    await saveLog(req.user?._id, "Litigation BI Directors", responseTime, response.data.statusCode === 200 ? "success" : "failed", req.body);

    if (!response.data || !response.data.result || response.data.result.length === 0) {
      return res.status(404).json({ success: false, message: "No data found from API." });
    }

    const resData = response.data.result[0]; // Ensure it exists

    let karzaCompanyDetails = {
      entityId: resolvedKid,
      litigationBiId: litigationBiId || null, // Store null if empty
      detailedDetails: resData,
      createdAt: new Date(),
      createdTrno: Date.now(),
      updatedAt: new Date(),
      updatedTrno: Date.now(),
    };

    // Save to MongoDB (Insert if not found)
    const savedCompany = await KarzaLitigationBiDirectors.findOneAndUpdate(
      { entityId: resolvedKid, litigationBiId: litigationBiId || null }, // Query
      karzaCompanyDetails, // Data
      { upsert: true, new: true } // Create if not exists
    );
    

    return res.status(200).json({
      success: true,
      data: savedCompany,
      message: "MCA details fetched successfully.",
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
};
