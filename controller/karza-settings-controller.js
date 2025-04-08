const KarzaSettings = require("../models/KarzaSettings");
const Settings = module.exports;

Settings.save = async (req, res) => {
  try {
    const { testMode, testUsername, testApiKey, testPassword, liveUsername, livePassword, liveApiKey } = req.body;

    let settings = await KarzaSettings.findOne();
    if (settings) {
      // Update existing settings
      settings.testMode = testMode;
      settings.testUsername = testUsername;
      settings.testApiKey = testApiKey;
      settings.testPassword = testPassword;
      settings.liveUsername = liveUsername;
      settings.livePassword = livePassword;
      settings.liveApiKey = liveApiKey;
    } else {
      // Create new settings
      settings = new KarzaSettings({ testMode, testUsername, testPassword, liveUsername, livePassword });
    }

    await settings.save();
    res.json({ message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
};

Settings.get = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};


Settings.getSettings = async () => {
  let settings = await KarzaSettings.findOne();
  if (!settings) {
    settings = new KarzaSettings({ testMode: false, testUsername: "", testPassword: "", liveUsername: "", livePassword: "" });
    await settings.save();
  }

  return settings;
}