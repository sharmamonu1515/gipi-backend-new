const axios = require("axios");
const KarzaLog = require("../models/APILog");
const mongoose = require("mongoose");
const Log = module.exports;

Log.getList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [{ userId: mongoose.Types.ObjectId.isValid(search) ? new mongoose.Types.ObjectId(search) : undefined }, { apiType: { $regex: search, $options: "i" } }],
        }
      : {};

    const totalRecords = await KarzaLog.countDocuments(query);
    const logs = await KarzaLog.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ dateTime: -1 });

    return res.status(200).json({
      success: true,
      data: {
        logs,
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
    console.error("Error fetching logs list:", error);
    return res.status(200).send({
      success: false,
      message: "Failed to fetch logs list.",
    });
  }
};
