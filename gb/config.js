const mode = process.env.NODE_ENV || "development";


import dotenv from "dotenv"; // Import dotenv using ES6 import

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
const baseConfig = {
  database: {
    MY_SQL_HOST: process.env.MY_SQL_HOST,
    MY_SQL_USER: process.env.MY_SQL_USER,
    MY_SQL_PASSWORD: process.env.MY_SQL_PASSWORD,
    DB_NAME: "commissaire",
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }, 
};

const configByEnv = {
  development: {
    ...baseConfig,
    mode: "development",
  },
  production: {
    ...baseConfig,
    mode: "production",
  },
};

export default configByEnv[mode];
