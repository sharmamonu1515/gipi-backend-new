const Settings = require("../controller/karza-settings-controller");

const Karza = module.exports;

Karza.URL = "https://app.karza.in";

async function getSettings() {
  return await Settings.getSettings();
}

Karza.isProduction = isProduction = async () => {
  const settings = await getSettings();
  return !settings.testMode;
};

async function testProdURLKey() {
  return (await isProduction()) ? "prod" : "test";
}

// Expose methods to get values dynamically
Karza.getAuthDetails = async () => {
  const settings = await getSettings();
  return (await isProduction()) ? { username: settings.liveUsername, password: settings.livePassword } : { username: settings.testUsername, password: settings.testPassword };
};

Karza.getAPIKey = async () => {
  const settings = await getSettings();
  return (await isProduction()) ? settings.liveApiKey : settings.testApiKey;
};

Karza.getAPIBaseURL = async () => `https://api.karza.in/kscan${(await isProduction()) ? "" : "/test"}`;
Karza.getBetaBaseURL = async () => ((await isProduction()) ? "" : "https://beta.kscan.in");
Karza.getLoginURL = async () => `${Karza.URL}/dashboard/${await testProdURLKey()}/login`;
Karza.getDashboardBaseURL = async () => `${Karza.URL}${(await isProduction()) ? "" : "/test"}/kscan`;

Karza.getFrontendV1BaseURL = async () => `${Karza.URL}/dashboard/${await testProdURLKey()}/api-wrapper/kscan/${await testProdURLKey()}/v1`;

Karza.getFrontendV3BaseURL = async () => `${Karza.URL}/dashboard/${await testProdURLKey()}/api-wrapper/kscan/${await testProdURLKey()}/v3`;

Karza.getClassificationURL = async () => `${await Karza.getFrontendV1BaseURL()}/litigations/bi/all/classification`;
Karza.getCreditsURL = async () => `${await Karza.getFrontendV1BaseURL()}/api-credits?&section=search`;
Karza.getSearchURL = async () => `${await Karza.getFrontendV3BaseURL()}/search/byIdOrName`;
Karza.getExcelURL = async () => `${await Karza.getFrontendV1BaseURL()}/litigations/bi/all/excel`;
Karza.getCompanyDetailsURL = async () => `${await Karza.getFrontendV3BaseURL()}/mca-details`;

Karza.getHeaders = async (cookie) => ({
  "Content-type": "application/json",
  Cookie: `_hjSession_2171476=eyJpZCI6Ijk1N2NmODQ2LTMzODQtNDVmOS05MGRiLTdiMmVhMTQ2MmQ5NiIsImMiOjE3NDI0NTMzNDkyMDMsInMiOjEsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjowLCJzcCI6MH0=; ${cookie}; st=90`,
  Origin: Karza.URL,
  Referer: `${await Karza.getDashboardBaseURL()}/litigation-bi`,
});
