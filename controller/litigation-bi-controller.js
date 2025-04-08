const axios = require("axios");
const KarzaLitigationBiAuth = require("../models/KarzaLitigationBiAuth");
const KarzaLitigationBiDetails = require("../models/KarzaLitigationBiDetails");
const KarzaLitigationBiFileDetails = require("../models/KarzaLitigationBiFileDetails");
const KarzaCompanyDetail = require("../models/KarzaCompanyDetail");
const KarzaLitigationBiDirectorDetails = require("../models/KarzaLitigationBiDirectorDetails");
const KarzaCompanyBulkDetails = require("../models/KarzaCompanyBulkDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const LitigationBI = module.exports;

LitigationBI.PAGE_SIZE = 5000;

//ck if session is valid
async function isSessionValid(setCookie) {
  try {
    const config = {
      method: "get",
      url: await Karza.getCreditsURL(),
      headers: await Karza.getHeaders(setCookie),
    };

    const response = await axios(config);
    return response.status !== 401; // If not 401, session is valid
  } catch (error) {
    if (error.response) {
      return error.response.status !== 401; // If not 401, session is valid
    }
    console.error("Error checking session:", error.message);
    return false; // Return false on any other error
  }
}

// Litigation BI Auth Details
LitigationBI.getAndSaveAuthToken = async () => {
  try {
    const loginDetails = await Karza.getAuthDetails();

    // Fetch stored session from DB
    let foundLitigationDetails = await KarzaLitigationBiAuth.findOne({ username: loginDetails.username });

    const isValidSession = foundLitigationDetails ? await isSessionValid(foundLitigationDetails.setCookie) : false;
    const loginurl = await Karza.getLoginURL();

    if (foundLitigationDetails && isValidSession) {
      console.log("Using existing session token.");
      return foundLitigationDetails;
    }

    // Session is invalid, perform login
    let config = {
      method: "post",
      url: await Karza.getLoginURL(),
      headers: {
        "Content-type": "application/json",
        Origin: Karza.URL,
        Referer: `${await Karza.getDashboardBaseURL()}/login`,
      },
      data: JSON.stringify(loginDetails),
    };

    let authDetails = await axios(config);
    let authSetCookie = authDetails.headers["set-cookie"][0].split(";")[0];

    if (!foundLitigationDetails) {
      let saveAuthData = new KarzaLitigationBiAuth({
        username: loginDetails.username,
        token: authDetails.data.data,
        setCookie: authSetCookie,
      });

      console.log("Login done, new entry created.");
      return await saveAuthData.save();
    } else {
      let updatedAuthData = await KarzaLitigationBiAuth.findOneAndUpdate(
        { username: loginDetails.username },
        { token: authDetails.data.data, setCookie: authSetCookie, isExpired: false },
        { new: true }
      );

      console.log("Login done, existing entry updated.");
      return updatedAuthData;
    }
  } catch (error) {
    console.error("Error in getAndSaveAuthToken:", error);
    return { error: error.message || "Unknown error" };
  }
};

// Get Litigation BI Details 5K records
LitigationBI.search = async (req, res) => {
  try {
    const startTime = Date.now();
    const { entityName, entityId, entityRelation, fuzzy, pageNo, latestData, kid } = req.body;

    const reqData = {
      entityName,
      countOnly: false,
      entityRelation: entityRelation || "",
      dateType: "filingDate",
      fuzziness: fuzzy || false,
      advocateRelation: "b",
      aggregationType: "date",
      entityId: entityId || "",
      searchType: "ENTITY",
      pageSize: LitigationBI.PAGE_SIZE,
      pageNo: pageNo || 1,
      ui_response: true,
      version: 3,
      section: "litigation",
    };

    let foundLitigationDetails = null;

    // Search from DB only when latestData is not requested
    if (!latestData) {
      foundLitigationDetails = await KarzaLitigationBiDetails.findOne({
        entityId,
        kid,
        name: entityName,
        entityRelation,
        fuzzy,
      }).sort({ updatedAt: -1 });

      if (foundLitigationDetails) {
        console.log("Returning filtered data from MongoDB.");
        return res.status(200).send({
          status: "success",
          message: "Litigation BI Details Fetched Successfully",
          data: foundLitigationDetails,
        });
      }
    }

    console.log(`Fetching page ${reqData.pageNo} from API.`);
    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getClassificationURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify(reqData),
    };

    axios
      .request(config)
      .then(async (response) => {
        const responseTime = Date.now() - startTime;

        await saveLog(req.user?._id, "Litigation BI", responseTime, response.data.statusCode === 200 ? "success" : "failed", req.body);

        const resData = response.data.result;
        let litigationViewDetails = {
          entityId,
          kid,
          entityName,
          entityRelation,
          fuzzy,
          type: "company",
          litigationDetails: resData,
          lastPageFetched: pageNo,
          userId: req.user?._id,
        };

        if (!foundLitigationDetails) {
          const savedEntry = await new KarzaLitigationBiDetails({
            ...litigationViewDetails,
            createdAt: new Date(),
            createdTrno: new Date(),
            updatedAt: new Date(),
            updatedTrno: new Date(),
          }).save();

          return res.status(201).send({
            status: "success",
            message: "Litigation BI Details Fetched Successfully",
            data: { ...litigationViewDetails, _id: savedEntry._id },
          });
        }

        await KarzaLitigationBiDetails.findByIdAndUpdate(foundLitigationDetails._id, {
          ...litigationViewDetails,
          createdAt: foundLitigationDetails.createdAt,
          createdTrno: foundLitigationDetails.createdTrno,
          updatedAt: new Date(),
          updatedTrno: new Date(),
          lastPageFetched: reqData.pageNo,
        });

        return res.status(200).send({
          status: "success",
          message: "Litigation BI Details Fetched Successfully",
          data: { ...litigationViewDetails, _id: foundLitigationDetails._id },
        });
      })
      .catch((error) => {
        return res.status(502).send({
          status: "karza_error",
          message: error.message,
          error,
        });
      });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: error.message,
    });
  }
};

// Get Ligitation BI Director search
LitigationBI.directorSearch = async (req, res) => {
  try {
    const startTime = Date.now();

    const { litigationBiId, entityName, din } = req.body;

    const foundLitigationDetails = await KarzaLitigationBiDetails.findOne({
      _id: litigationBiId,
    });

    const reqData = {
      entityName: entityName,
      countOnly: false,
      entityRelation: foundLitigationDetails.entityRelation,
      dateType: "filingDate",
      fuzziness: foundLitigationDetails.fuzzy,
      advocateRelation: "b",
      aggregationType: "date",
      entityId: din,
      searchType: "INDIVIDUAL",
      pageSize: LitigationBI.PAGE_SIZE,
      pageNo: 1,
      ui_response: true,
      version: 3,
      section: "litigation",
    };

    const foundDirectorDetails = await KarzaLitigationBiDirectorDetails.findOne({
      litigationBiId: litigationBiId,
      entityId: din,
    });

    // Search from DB only when latestData is not requested
    if (foundDirectorDetails) {
      console.log("Returning director details data from MongoDB.");
      return res.status(200).send({
        status: "success",
        message: "Litigation BI director details Fetched Successfully",
        data: foundDirectorDetails,
      });
    }

    console.log(`Fetching Litigation BI Director details from API.`);
    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getClassificationURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify(reqData),
    };

    axios
      .request(config)
      .then(async (response) => {
        const responseTime = Date.now() - startTime;

        await saveLog(req.user?._id, "Litigation BI Director Details", responseTime, response.data.statusCode === 200 ? "success" : "failed", req.body);

        const resData = response.data.result;
        let litigationDirectorDetails = {
          entityId: din,
          litigationBiId: litigationBiId,
          entityName,
          type: "INDIVIDUAL",
          litigationDetails: resData,
          userId: req.user?._id,
        };

        if (!foundDirectorDetails) {
          const savedEntry = await new KarzaLitigationBiDirectorDetails({
            ...litigationDirectorDetails,
            createdAt: new Date(),
            createdTrno: new Date(),
          }).save();

          return res.status(201).send({
            status: "success",
            message: "Litigation BI Director Details Fetched Successfully",
            data: { ...litigationDirectorDetails, _id: savedEntry._id },
          });
        }

        await KarzaLitigationBiDirectorDetails.findByIdAndUpdate(
          {
            entityId: din,
            litigationBiId: litigationBiId,
          },
          {
            ...litigationDirectorDetails,
            createdAt: foundDirectorDetails.createdAt,
            createdTrno: foundDirectorDetails.createdTrno,
            updatedAt: new Date(),
            updatedTrno: new Date(),
          }
        );

        return res.status(200).send({
          status: "success",
          message: "Litigation BI Director Details Fetched Successfully",
          data: { ...litigationDirectorDetails, _id: foundDirectorDetails._id },
        });
      })
      .catch((error) => {
        return res.status(502).send({
          status: "karza_error",
          message: error.message,
          error,
        });
      });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: error.message,
    });
  }
};

// Get Litigation BI List
LitigationBI.getList = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", sort = "updatedAt", order = "asc" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Allowed sorting fields to prevent abuse
    const allowedSortFields = ["updatedAt", "createdAt", "name", "entityId"];
    if (!allowedSortFields.includes(sort)) {
      sort = "updatedAt";
    }

    const sortOrder = order === "desc" ? -1 : 1;

    const query = search
      ? {
          $or: [{ entityId: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaLitigationBiDetails.countDocuments(query);

    const projection = {
      _id: 1,
      name: 1,
      entityName: 1,
      entityId: 1,
      createdAt: 1,
      updatedAt: 1,
      "litigationDetails.totalCases": 1,
    };

    const litigationBIs = await KarzaLitigationBiDetails.find(query, projection)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ [sort]: sortOrder });

    return res.status(200).json({
      success: true,
      data: {
        litigationBIs,
        pagination: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
          pageSize: limit,
        },
      },
      message: "Litigation BI list fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Litigation BI list:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch Litigation BI list.",
    });
  }
};

// Get Litigation BI by ID
LitigationBI.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const litigationBiDetails = await KarzaLitigationBiDetails.findById(id);
    if (!litigationBiDetails) {
      return res.status(404).json({ success: false, message: "Litigation BI not found" });
    }

    return res.status(200).json({
      success: true,
      data: litigationBiDetails,
      message: "Litigation BI fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching Litigation BI:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Litigation BI." });
  }
};

// Export excel lite
LitigationBI.exportExcel = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const { entityType = "company", id, fileType = "lite" } = req.body;

    const isEntity = entityType === "company";

    let litigationDetails = null;
    let litigationDirectorDetails = null;

    if (isEntity) {
      litigationDetails = await KarzaLitigationBiDetails.findById(id);
      if (!litigationDetails) {
        return res.status(404).json({ message: "Record not found" });
      }
    } else {
      // check director
      litigationDirectorDetails = await KarzaLitigationBiDirectorDetails.findById(id);
      if (!litigationDirectorDetails) {
        return res.status(404).json({ message: "Record not found" });
      }

      litigationDetails = await KarzaLitigationBiDetails.findById(litigationDirectorDetails.litigationBiId);
      if (!litigationDetails) {
        return res.status(404).json({ message: "Record not found" });
      }
    }

    const startTime = Date.now();

    // **Define storage paths**
    const storageDir = path.join(__dirname, "../../client/public/uploads/excel_files");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `litigation_${id}_${fileType}.zip`;
    const filePath = path.join(storageDir, fileName);

    // **Check if file already exists**
    if (fs.existsSync(filePath)) {
      return res.send({
        status: "success",
        message: "File already available",
        downloadLink: `/client/public/uploads/excel_files/${fileName}`,
      });
    }

    // **Prepare API Request Data**
    const reqData = {
      entityName: isEntity ? litigationDetails.entityName : litigationDirectorDetails.entityName,
      countOnly: false,
      entityRelation: litigationDetails.entityRelation || "",
      dateType: "filingDate",
      fuzziness: litigationDetails.fuzzy || false,
      advocateRelation: "b",
      aggregationType: "date",
      entityId: isEntity ? litigationDetails.entityId : litigationDirectorDetails.entityId,
      searchType: isEntity ? litigationDetails.type : "INDIVIDUAL",
      pageSize: LitigationBI.PAGE_SIZE,
      pageNo: 1,
      ui_response: true,
      version: 3,
      section: "litigation",
      exportType: "c",
      type: fileType,
      sheetSize: fileType === "lite" ? 5000 : 2000,
      excelSheet: "allRecords",
    };

    if (!isEntity) {
      reqData["directorSearchType"] = "all";
    }

    // **Fetch Auth Token**
    console.log(`Fetching File from API.`);
    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getExcelURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify(reqData),
    };

    const response = await axios.request(config);

    if (!response.data.result.downloadLink) {
      return res.status(500).json({ status: "error", message: "No downloadable file found!" });
    }

    // **Download ZIP File**
    const fileResponse = await axios.get(response.data.result.downloadLink, { responseType: "stream" });

    const writer = fs.createWriteStream(filePath);
    fileResponse.data.pipe(writer);

    writer.on("finish", async () => {
      console.log(`ZIP file saved: ${filePath}`);

      const responseTime = Date.now() - startTime;
      await saveLog(req.user?._id, `Litigation BI ${isEntity ? "" : "Director "}Excel (${fileType})`, responseTime, "success", reqData);

      return res.send({
        status: "success",
        message: "Litigation BI ZIP File Fetched Successfully",
        downloadLink: `/uploads/excel_files/${fileName}`,
      });
    });

    writer.on("error", (err) => {
      return res.send({ status: "error", message: err.message });
    });
  } catch (error) {
    return res.send({ status: "error", message: error.message });
  }
};

// Get Litigation BI Details for fetching 20 records - just for backup
/*
LitigationBI.search = async (req, res) => {
  try {
    const reqData = {
      entityName: req.body.entityName,
      countOnly: false,
      entityRelation: req.body.entityRelation || "",
      dateType: "filingDate",
      fuzziness: req.body.fuzzy || false,
      advocateRelation: "b",
      aggregationType: "date",
      entityId: req.body.entityId || "",
      searchType: "ENTITY",
      pageSize: 20,
      pageNo: req.body.pageNo || 1,
      ui_response: true,
      version: 3,
      section: "litigation",
    };

    let foundLitigationDetails = await KarzaLitigationBiDetails.findOne({
      entityId: reqData.entityId,
      name: reqData.entityName,
      entityRelation: reqData.entityRelation,
    }).sort({ updatedAt: -1 }); // Sort by updatedAt in descending order to get the latest record

    // Helper function to get paginated records
    const getRecordsForPage = (records) => records.slice((reqData.pageNo - 1) * reqData.pageSize, reqData.pageNo * reqData.pageSize);

    const courtTypes = [
      'districtCourts', 'highCourts', 'consumerCourt', 
      'supremeCourt', 'tribunalCourts', 'reraCourts'
    ];

    // If data exists and lastPageFetched covers the requested page, filter and return only required records.
    if (foundLitigationDetails && foundLitigationDetails.lastPageFetched >= reqData.pageNo) {
      console.log("Returning filtered data from MongoDB.");
      
      const filteredData = {
        ...foundLitigationDetails.toObject(),
        litigationDetails: {
          ...foundLitigationDetails.litigationDetails,
          records: courtTypes.reduce((acc, courtType) => {
            acc[courtType] = getRecordsForPage(foundLitigationDetails.litigationDetails.records[courtType]);
            return acc;
          }, {})
        }
      };
    
      return res.send({
        status: "success",
        message: "Litigation BI Details Fetched Successfully",
        data: filteredData
      });
    }

    // If the requested page is missing, fetch from API
    console.log(`Fetching page ${reqData.pageNo} from API.`);
    const litigationAuthDetails = await LitigationBI.getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: await Karza.getClassificationURL(),
      headers: await Karza.getHeaders(litigationAuthDetails.setCookie),
      data: JSON.stringify(reqData),
    };

    axios
      .request(config)
      .then(async (response) => {
        const resData = response.data.result;

        let litigationViewDetails = {
          entityId: reqData.entityId,
          name: reqData.entityName,
          type: "company",
          entityRelation: reqData.entityRelation,
          litigationDetails: resData,
          lastPageFetched: reqData.pageNo,
        };

        // it means we have fetched only 1st page, create a new entry
        if (!foundLitigationDetails) {
          // Create new entry
          litigationViewDetails.createdAt = litigationViewDetails.updatedAt;
          litigationViewDetails.createdTrno = litigationViewDetails.updatedTrno;

          const saveLitigationDetails = new KarzaLitigationBiDetails(litigationViewDetails);
          await saveLitigationDetails.save();
        } else {
          const foundObj = foundLitigationDetails.toObject();
          litigationViewDetails.createdAt = foundObj.createdAt;
          litigationViewDetails.createdTrno = foundObj.createdTrno;
          litigationViewDetails.lastPageFetched = reqData.pageNo;

          litigationViewDetails.litigationDetails.records = courtTypes.reduce((acc, courtType) => {
            acc[courtType] = [...foundObj.litigationDetails.records[courtType], ...litigationViewDetails.litigationDetails.records[courtType]];
            return acc;
          }, {});

          await KarzaLitigationBiDetails.findByIdAndUpdate(foundObj._id, litigationViewDetails);
        }

        // Prepare response with paginated data
        const paginatedData = {
          ...litigationViewDetails,
          litigationDetails: {
            ...litigationViewDetails.litigationDetails,
            records: courtTypes.reduce((acc, courtType) => {
              acc[courtType] = getRecordsForPage(litigationViewDetails.litigationDetails.records[courtType]);
              return acc;
            }, {}),
          },
        };

        return res.send({
          status: "success",
          message: "Litigation BI Details Fetched Successfully",
          data: paginatedData,
        });
      })
      .catch((error) => {
        return res.send({ status: "karza_error", message: error.message, error: error });
      });
  } catch (error) {
    return res.send({ status: "error", message: error.message });
  }
};
*/
