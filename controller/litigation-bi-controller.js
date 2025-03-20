const axios = require("axios");
const KarzaPeerComparision = require("../models/KarzaPeerComparision");
const KarzaLitigationBiAuth = require("../models/KarzaLitigationBiAuth");
const KarzaLitigationBiDetails = require("../models/KarzaLitigationBiDetails");
const KarzaLitigationBiFileDetails = require("../models/KarzaLitigationBiFileDetails");
const KarzaCompanyDetail = require("../models/KarzaCompanyDetail");
const KarzaLitigationBiDirectorFileDetails = require("../models/KarzaLitigationBiDirectorFileDetails");
const KarzaCompanyBulkDetails = require("../models/KarzaCompanyBulkDetails");
const Karza = require("../lib/karza");
const saveLog = require("../lib/logHelper");

const LitigationBI = module.exports;

// Litigation BI Auth Details
async function getAndSaveAuthToken() {
  try {
    const loginDetails = Karza.AUTH_DETAILS;

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: Karza.LOGIN_URL,
      headers: {
        "Content-type": "application/json",
        // Cookie: "_hjSessionUser_2171476=eyJpZCI6IjA2YmY4YmY5LTlmNDMtNWUwOC05YWMyLWI0ODAxOTFlMzlkNCIsImNyZWF0ZWQiOjE3NDE3NzgwMjIzODgsImV4aXN0aW5nIjp0cnVlfQ==",
        Origin: Karza.URL,
        Referer: `${Karza.DASHBOARD_BASE_URL}/login`,
      },
      data: JSON.stringify(loginDetails),
    };

    let authDetails = await axios(config);
    let authSetCookie = authDetails.headers["set-cookie"][0].split(";");

    // check if token already saved for given username for the env
    let foundLitigationDetails = await KarzaLitigationBiAuth.findOne({ username: loginDetails.username, type: Karza.ENV });

    if (!foundLitigationDetails) {
      let saveAuthData = new KarzaLitigationBiAuth({
        username: loginDetails.username,
        token: authDetails.data.data,
        setCookie: authSetCookie[0],
        type: Karza.ENV,
      });

      console.log("Login done, new entry created.");

      return await saveAuthData.save();
    } else {
      let updatedAuthData = await KarzaLitigationBiAuth.findOneAndUpdate(
        { username: loginDetails.username, type: Karza.ENV },
        {
          token: authDetails.data.data,
          setCookie: authSetCookie[0],
          isExpired: false,
        },
        { new: true }
      );

      console.log("Login done, existing entry updated.");

      return updatedAuthData;
    }
  } catch (error) {
    console.error("Error in getAndSaveAuthToken:", error);
    return { error: error.message || "Unknown error" };
  }
}

// Get Litigation BI Details
LitigationBI.search = async (req, res) => {
  try {
    const reqData = {
        //   entityName: `${req.body.company_search_details.result[0].name}`,
        entityName: req.body.entityName,
        countOnly: false,
        entityRelation: "b",
        dateType: "filingDate",
        fuzziness: false,
        advocateRelation: "b",
        aggregationType: "date",
        entityId: req.body.entityId,
        searchType: "ENTITY",
        pageSize: 5000,
        pageNo: 1,
        ui_response: true,
        version: 3,
        section: "litigation",
    };

    let data = JSON.stringify(reqData);

    const litigationAuthDetails = await getAndSaveAuthToken();

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: Karza.CLASSIFICATION_URL,
      headers: {
        "Content-type": "application/json",
        Cookie: `_hjSession_2171476=eyJpZCI6Ijk1N2NmODQ2LTMzODQtNDVmOS05MGRiLTdiMmVhMTQ2MmQ5NiIsImMiOjE3NDI0NTMzNDkyMDMsInMiOjEsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; ${litigationAuthDetails.setCookie}; st=90`,
        Origin: Karza.URL,
        Referer: `${Karza.DASHBOARD_BASE_URL}/litigation-bi`,
      },
      data: data,
    };

    axios
      .request(config)
      .then(async (response) => {

        const resData = response.data.result;

        let litigationViewDetails = {
          entityId: reqData.entityId,
          name: reqData.entityName,
          type: "company",
          litigationDetails: resData,
        };

        let foundLitigationDetails = await KarzaLitigationBiDetails.findOne({
          entityId: reqData.entityId,
          name: reqData.entityName,
        });

        if (!foundLitigationDetails) {
          litigationViewDetails.createdAt = new Date();
          litigationViewDetails.createdTrno = Date.now();
          litigationViewDetails.updatedAt = new Date();
          litigationViewDetails.updatedTrno = Date.now();
          let saveLitigationDetails = new KarzaLitigationBiDetails(litigationViewDetails);
          await saveLitigationDetails.save();
        } else {
          let foundLitigationDetailsObj = foundLitigationDetails.toObject();
          litigationViewDetails.createdAt = foundLitigationDetailsObj.createdAt;
          litigationViewDetails.createdTrno = foundLitigationDetailsObj.createdTrno;
          litigationViewDetails.updatedAt = new Date();
          litigationViewDetails.updatedTrno = Date.now();
          await KarzaLitigationBiDetails.findByIdAndUpdate(foundLitigationDetailsObj._id, litigationViewDetails);
        }

        return res.send({ status: "success", message: "Litigation BI Details Fetched Successfully" });
      })
      .catch((error) => {
        return res.send({ status: "karza_error", message: error.message, error: error });
      });
  } catch (error) {
    return res.send({ status: "error", message: error.message });
  }
};
