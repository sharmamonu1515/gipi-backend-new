const APILog = require("../models/APILog");
const Karza = require("../lib/karza");

const saveLog = async (userId, apiType, responseTime, status = "success", additionalData = {}) => {
  try {
    const isProduction = await Karza.isProduction();
    await APILog.create({
      userId,
      apiType,
      responseTime,
      additionalData,
      mode: isProduction ? "production" : "test",
      status,
    });
    console.log("Log saved successfully");
  } catch (error) {
    console.error("Error saving log:", error);
  }
};

module.exports = saveLog;
