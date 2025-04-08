var mongoose = require('mongoose');

const karzaSettingsSchema = new mongoose.Schema({
    testMode: Boolean,
    testUsername: String,
    testPassword: String,
    testApiKey: String,
    liveUsername: String,
    livePassword: String,
    liveApiKey: String
}, { timestamps: true });

const KarzaSettings = mongoose.model('karza_settings', karzaSettingsSchema);

module.exports = KarzaSettings;