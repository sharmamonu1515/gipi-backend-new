const Karza = module.exports

Karza.ENV = process.env.APP_ENV || 'local';


function isProduction() {
    return Karza.ENV !== 'local';
}

Karza.URL = 'https://app.karza.in';

Karza.API_KEY = process.env.KARZA_API_KEY || '';

Karza.API_BASE_URL = `https://api.karza.in/kscan${isProduction() ? '' : '/test'}`;

Karza.BETA_BASE_URL = isProduction() ? '' : 'https://beta.kscan.in';

Karza.AUTH_DETAILS = isProduction() ? {
   username: 'empliance_operations',
    password: 'Empliance@2022'
} : {
    username: 'empliance_shweta',
    password: 'Empliance@2425',
}

Karza.LOGIN_URL = `${Karza.URL}/dashboard/${isProduction() ? 'prod' : 'test'}/login`

Karza.DASHBOARD_BASE_URL = `${Karza.URL}${isProduction() ? '' : '/test'}/kscan`;

Karza.CLASSIFICATION_URL = `${Karza.URL}/dashboard/${isProduction() ? 'prod' : 'test'}/api-wrapper/kscan/${isProduction() ? 'prod' : 'test'}/v1/litigations/bi/all/classification`