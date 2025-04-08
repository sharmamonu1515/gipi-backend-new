var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports

module.exports = mongoose.model('karza_aml_sanctions_screening', new Schema({}, { strict: false} ));