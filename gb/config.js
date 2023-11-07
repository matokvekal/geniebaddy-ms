


// const mode = process.env.MODE || 'production';
const mode = process.env.MODE || 'development';


const configByEnv = {
	development: {
		mode: 'development',
		database: {
			HOST:process.env.DB_HOST || 'dbcommissairenew.cig6gnsg5vjp.eu-central-1.rds.amazonaws.com',
			USER: process.env.DB_USER ||'admin',
			PORT:  process.env.DB_PORT ||3306,
			PASSWORD: process.env.DB_PASSWORD ||'zaqzaq8*',
			NAME: process.env.DB_NAME || 'commissaire',
			dialect: 'mysql',
			pool: {
				max: 5,
				min: 0,
				acquire: 30000,
				idle: 10000,
			},
		},
		port: process.env.PORT || 5000,
		allowedOrigins:
			'http://localhost:5000,http://localhost:3000,http://localhost:3001,www.commissaire.us,http://www.commissaire.us,https://www.commissaire.us,d2pi1ekwewlf4x.cloudfront.net,https://d2pi1ekwewlf4x.cloudfront.net,http://d2pi1ekwewlf4x.cloudfront.net',
		TOKEN_KEY: 'COMMISSAIRE_TOKEN_KEY_PRODUCTION',
		confirmationCodeLimit: 5,
		tokenExpireDayLimit: 360,
		loggerDebounceAmountInMS: 60000,
		smsSiteID: 35749,
		smsSitePassword: 'commissaire',
		smsSenderPhone: 'commissaire',
		smsMessageInnerName: 'commissaire',
		allowedAmountOfRequestsForIpPerMinute: 600,
		allowedAmountOfRequestsForIpPerFullDay: 10000,
		googlePhonenumber: '11111111111',
		gmailUserName: 'tipusharim@gmail.com',
		gmailPassword: 'Gilad2023',
	},
};

export default configByEnv[mode];
export { configByEnv };