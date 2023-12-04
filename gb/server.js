import cron from "node-cron";
import Sequelize from "sequelize";
import configByEnv from "./config.js";
const mode = process.env.MODE || "development";
const dbConfig = configByEnv.database;
import moment from "moment";

export const postStatus = {
  OPEN: `open`,
  CLOSED: `closed`,
  DELETED: `deleted`,
  NEW: `new`,
  HOLD: `hold`,
};

export const serverConstants = {
  MAX_MESSAGE_GENIE_WATCH_PER_DAY: 10,
  MAX_MESSAGE_GENIE_ANSWER_PER_DAY: 10,
};

const sequelize = new Sequelize(
  dbConfig.DB_NAME,
  dbConfig.USER || process.env.MY_SQL_USER,
  dbConfig.PASSWORD || process.env.MY_SQL_PASSWORD,
  {
    host: dbConfig.MY_SQL_HOST || process.env.MY_SQL_HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    dialectOptions: {
      multipleStatements: true,
    },
    pool: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      acquire: dbConfig.pool.acquire,
      idle: dbConfig.pool.idle,
    },
    logging: false,
  }
);

// Test the DB connection
sequelize
  .authenticate()
  .then(() => {
    console.log(
      "Connection to the database has been established successfully."
    );
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

async function updateHoldToNew() {
  const checkSQL = `
  SELECT COUNT(*) as count 
  FROM genie_posts 
  WHERE post_status = 'hold' 
    AND status_time < UTC_TIMESTAMP() - INTERVAL 10 MINUTE 
    AND is_active = 1`;

  const [results, metadata] = await sequelize.query(checkSQL);
  const count = results[0].count;

  if (count > 0) {
    console.log(`Found ${count} records to update.`);

    console.log("Starting SQL execution...");
    const SQL = `UPDATE genie_posts SET post_status='new',
        status_time=UTC_TIMESTAMP(),
        genie_id=0  
        WHERE post_status="hold" 
        AND status_time <UTC_TIMESTAMP() - INTERVAL 10 MINUTE 
      and is_active=1`;
    // console.log("SQL:", SQL);
    await sequelize.query(SQL);
  } else {
    console.log("No records to update.");
  }
}

async function checkPostCount() {
  const yesterdayUTC = moment
    .utc()
    .subtract(1, "day")
    .format("YYYY-MM-DD HH:mm:ss");
  //here we update the post acount for user after 24 houres
  const SQL2 = `
    UPDATE genie_users SET
    user_posts_count = CASE
      WHEN DATE(user_posts_count_date) <= DATE('${yesterdayUTC}') THEN 0
      ELSE user_posts_count
    END,
    user_posts_count_date = CASE
      WHEN DATE(user_posts_count_date) <= DATE('${yesterdayUTC}') THEN NULL
      ELSE user_posts_count_date
    END,
    last_updated = UTC_TIMESTAMP()
     WHERE
    user_role = 'user'
    AND is_active = 1
    AND is_register = 1`;

  await sequelize.query(SQL2);

  const SQL3 = `
  UPDATE genie_users SET
  genie_watching_ids = CASE
    WHEN DATE(genie_watching_id_date) <= DATE('${yesterdayUTC}') THEN NULL
    ELSE genie_watching_ids
  END,
  genie_watching_id_date = CASE
    WHEN DATE(genie_watching_id_date) <= DATE('${yesterdayUTC}') THEN NULL
    ELSE genie_watching_id_date
  END,
  genie_answer_count = CASE
    WHEN DATE(genie_answer_count_date) <= DATE('${yesterdayUTC}') THEN 0
    ELSE genie_answer_count
  END,
  genie_answer_count_date = CASE
    WHEN DATE(genie_answer_count_date) <= DATE('${yesterdayUTC}') THEN NULL
    ELSE genie_answer_count_date
  END,
  last_updated = UTC_TIMESTAMP()
  WHERE
  user_role = 'genie'
  AND is_active = 1
  AND is_register = 1
  `;
  // console.log("SQL3:", SQL3);
  await sequelize.query(SQL3);
  const utcString = moment.utc().format("DD-MM-YYYY HH:mm:ss");
  console.log("SQL execution completed.", utcString);
}
// when genie watch new post we change them to post_status=hold, but after 10 minutes we  change them back to post_status=new so other users can watch them
async function run() {
  console.log(
    "Runing SQL execution...",
    moment.utc().format("DD-MM-YYYY HH:mm:ss")
  );
  try {
    await updateHoldToNew();
    await checkPostCount();
  } catch (error) {
    console.error("Error executing SQL:", error);
  }
}

// Custom cron format
const executeMinutesParam = 1; // Run every 1 minute
const cronExecuteFormat = `*/${executeMinutesParam} * * * *`; // EVERY X MINUTES

// Cron job based on the custom format
cron.schedule(cronExecuteFormat, async function () {
  try {
    await run();
  } catch (e) {
    console.error("Error occurred in cron job:", e);
  }
});
