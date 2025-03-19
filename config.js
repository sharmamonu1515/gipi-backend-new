/*
* Desc: Config.js contains all configuration variables and keys needed in the application
* Usage: To create a new config key, use config.<your key name >. Then import the config.js in your module
*
*/

var config = module.exports;
const PRATE_ENV = process.env.PRATE_ENV; //The PRATE_ENV is set by the production.env on the AWS instances('test', 'staging', 'production')
const RUNNING_ON_AWS = (PRATE_ENV && PRATE_ENV !== '');


config.express = {
  port: process.env.APP_PORT || 3002,
  ip: '127.0.0.1'
};

config.appName = process.env.APP_NAME;
config.supportEmail = process.env.SUPPORT_EMAIL;
config.system = {
  allowFacebookLogin: false,
  allowFacebookSignup: false,
  allowGoogleLogin: false,
  allowPhoneSignup: false,
  allowPhoneLogin: false,
}

config.dbConnection = {
  string: process.env.MONGO_URI,
  mongoURI: process.env.MONGO_URI,
 };

config.mailgun = {
  key: process.env.MAILGUN_API_KEY,
  attachment_dir: './dist/public/email_attachments/',
};

// Email Provider
config.emailProvider = {
  name: process.env.EMAIL_PROVIDER || 'PureSMTP',
}

// Sender Email Credentials and configurations
config.smtp = {
  port: "",
  protocol: "",
  service: 'gmail',
  username: process.env.SENDGRID_USERNAME,
  password: process.env.SENDGRID_PASSWORD,
  fromEmail:process.env.SENDGRID_FROM_EMAIL
}

config.auth = {
  'facebook': {
    'clientID': process.env.FACEBOOK_AUTH_CLIENT_ID,
    'clientSecret': process.env.FACEBOOK_AUTH_CLIENT_SECRET,
    'callbackURL': process.env.FACEBOOK_AUTH_CB_URL // 'http://localhost:8080/auth/facebook/callback'
  },
  'google': {
    'clientID': process.env.GOOGLE_AUTH_CLIENT_ID,
    'clientSecret': process.env.GOOGLE_AUTH_CLIENT_SECRET,
    'callbackURL': process.env.GOOGLE_AUTH_CB_URL // 'http://localhost:8080/auth/google/callback'
  },
  'twitter': {
    'consumerKey': process.env.TWITTER_AUTH_CONSUMER_KEY,
    'consumerSecret': process.env.TWITTER_AUTH_CONSUMER_SECRET,
    'callbackURL': process.env.TWITTER_AUTH_CB_URL // 'http://localhost:8080/auth/twitter/callback'
  }
}
config.google = {
  "googleLatLong": "http://maps.googleapis.com/maps/api/geocode/json",
  "distanceMatrix": "https://maps.googleapis.com/maps/api/distancematrix/json",
  "maps_key": process.env.GOOGLE_MAP_API_KEY,
};

config.email = {
  feedback: process.env.FEEDBACK_EMAIL
}

//defaults
config.defaults = {

}

config.twilio = {
  accountSid:process.env.TWILIO_ACCOUNT_SID,
  authToken:process.env.TWILIO_AUTH_TOKEN,
  phoneNumber:process.env.TWILIO_PHONE_NUMBER,
  faxesNumber:process.env.TWILIO_FAXES_NUMBER,
}

//Set configs based on production env
if (PRATE_ENV === 'production') {
  config.express.ip = '0.0.0.0'
  config.express.isOnProduction = true;
} else {
  config.express.isOnProduction = false;
}

//Set base url of app
config.base_url = process.env.APP_BASE_URL
config.frontBaseUrl = process.env.FRONT_BASE_URL;


//Set any configs that will need to run if we are running on any of the AWS instances
if (RUNNING_ON_AWS) {
  config.express.staticFilesPath = './dist/public';
} else {
  config.express.staticFilesPath = './client/public';
}

config.registration = {
  bypassEmail: false
};

config.jwtSecret = process.env.JWT_SECRET || 'sdfasdf348fj5586';
config.jwtExpireTime = process.env.JWT_EXPIRE_TIME_ADMIN || '24h';

// Service Use For send Authentication And OTP Expire Time
config.OTP_Provider = {
  name: 'Twilio',
  OTPExpire: 10
}

config.notifiDate = {
  value: 7,
  filterPageLimit: 10
}

config.supportDetails = {
  email: process.env.PRODUCTION_SUPPORT_MAIL || 'support@mailinator.com'
}

config.searchTypeValue = 'Domestic';
config.uniqueFileName = 'No Name';

config.searchType = function () {
  return config.searchTypeValue;
}

config.uniqueName = function () {
  return config.uniqueFileName;
}