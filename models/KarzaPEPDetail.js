var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports

module.exports = mongoose.model('karza_pep_detail', new Schema({}, { strict: false} ));