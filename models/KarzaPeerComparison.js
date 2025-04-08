var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports

module.exports = mongoose.model('karza_peer_comparison', new Schema({}, { strict: false} ));