var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports

module.exports = mongoose.model('litigation_bi_auth', new Schema({
    token: {type: String, required: true},
    username: {type: String, required: true},
    isExpired: {type: Boolean, default: false},
    setCookie: {type: String, required: true}
}));