const Log = require("../models/Log");

const saveLog = async (userId, apiType, responseTime, status = 'success', additionalData = {}) => {
  try {
    await Log.create({
      userId,
      apiType,
      responseTime,
      additionalData,
      status,
    });
    console.log("Log saved successfully");
  } catch (error) {
    console.error("Error saving log:", error);
  }
};

module.exports = saveLog;
