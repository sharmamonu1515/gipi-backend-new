var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports

module.exports = mongoose.model('mca_company_bulk_detail', new Schema({
    CIN: String,
    name: String,
    status: String,
    type: String
} ));