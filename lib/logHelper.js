const Log = require("../models/Log");

const saveLog = async (userId, apiType, responseTime, additionalData = {}) => {
  try {
    await Log.create({
      userId,
      apiType,
      responseTime,
      additionalData,
    });
    console.log("Log saved successfully");
  } catch (error) {
    console.error("Error saving log:", error);
  }
};

module.exports = saveLog;
