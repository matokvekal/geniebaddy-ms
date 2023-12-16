import cron from "node-cron";
import Sequelize from "sequelize";
import configByEnv from "./config.js";
const mode = process.env.MODE || "development";
const dbConfig = configByEnv.database;
import moment from "moment";
import OpenAI from "openai";
const openai = new OpenAI();
const openai_api_key = configByEnv.OPEN_AI_KEY;



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
  console.log("Running updateHoldToNew");
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
  console.log("Running checkPostCount");
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
  await sequelize.query(SQL3);
  const utcString = moment.utc().format("DD-MM-YYYY HH:mm:ss");
  console.log("SQL execution completed.", utcString);
}
async function updateTopicCounts() {
  try {
    console.log("Running updateTopicCounts");
    // Initialize counts for all topics to 0
    const allTopicsResult = await sequelize.query(
      `SELECT id FROM genie_topics`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let topicCounts = {};
    allTopicsResult.forEach((topic) => {
      topicCounts[topic.id] = 0;
    });

    // Fetch preferred_topics for genies active in the last 2 months
    const queryResult = await sequelize.query(
      `SELECT preferred_topics
       FROM genie_users
       WHERE user_role = 'genie' 
         AND is_active = 1 
         AND last_active > NOW() - INTERVAL 2 MONTH`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Process the result to update counts
    queryResult.forEach((row) => {
      row.preferred_topics.split(",").forEach((topicId) => {
        if (topicId in topicCounts) {
          topicCounts[topicId] += 1;
        }
      });
    });

    // Update genie_topics with the new counts
    for (const [topicId, count] of Object.entries(topicCounts)) {
      await sequelize.query(
        `UPDATE genie_topics
         SET active_genies = :count
         WHERE id = :topicId`,
        {
          replacements: { count: count, topicId: topicId },
          type: Sequelize.QueryTypes.UPDATE,
        }
      );
    }
  } catch (error) {
    console.error("Error in updateTopicCounts:", error);
  }
}

async function ai() {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Who won the world series in 2020?" },
      {
        role: "assistant",
        content: "The Los Angeles Dodgers won the World Series in 2020.",
      },
      { role: "user", content: "Where was it played?" },
    ],
    model: "gpt-3.5-turbo",
  });
  console.log(completion.choices[0]);
  return completion.choices[0];
}

async function getrowFromDb() {
  //not rady at all
  const SQL = `SELECT * FROM genie_posts WHERE post_status='AI_USER' LIMIT 1`;
  const [results, metadata] = await sequelize.query(SQL);
  return results[0];
}

async function processPostAtAi() {
  //not rady at all
  const row = await getrowFromDb();
  // const completion = await openai.chat.completions.create({
  return data;
}

async function updatePostToDb() {
  //not rady at all
  const SQL = `UPDATE genie_posts SET post_status='AI_USER' WHERE id=${row.id}`;
  const [results, metadata] = await sequelize.query(SQL);
  return results[0];
}

// when genie watch new post we change them to post_status=hold, but after 10 minutes we  change them back to post_status=new so other users can watch them
async function run() {
  console.log(
    "Runing SQL execution...",
    moment.utc().format("DD-MM-YYYY HH:mm:ss")
  );
  try {
    await ai();
    // await updateHoldToNew();
    // await checkPostCount();
  } catch (error) {
    console.error("Error executing SQL:", error);
  }
}

console.log(
  "starting ms-genie-cron",
  moment.utc().format("DD-MM-YYYY HH:mm:ss")
);
const executeMinutesParam = 1; // Run every 1 minute

async function runAndUpdate() {
  try {
    openai.api_key = openai_api_key;
    while (true) {
      const shouldRun = await run();
      if (!shouldRun) {
        console.log("Sleeping for 1 minute...");
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000)); // Sleep for 1 minute (60 seconds)
      }
    }
  } catch (e) {
    console.error("Error occurred:", e);
  }
}

// Start the loop
runAndUpdate();

/////////////////////
/////server
//server new postcheck config array ['user_1','user_2','user_3','genie_1','genie_2','genie_3']
// if array.lenth===0 do nothing
//else if current user/genie is not in array continu
//else if current user/genie is in array then update post status to AI_USER / or AI_GENIE
//update the post to post_ai
//update all the rest as well, but in the user_X or genie_X update "post is checking"

/////service
//this service check if post_status=AI_USER or AI_GENIE, if so
//get the post
//2 diferent usecase:1)last_writen_by='user_1' then we also have to ask for metrics, else we just ask for answer
//send to ai
//wait for response
//qw are asking the ai  for:
//1)is there personal details that can recognize the user/genie (name, phone, email, address, etc)   yess or no be sure 100%
//2)is there any bad words in the post? קללות אלימות,מיניות טרור השצות ניצול רמאות  yess no 100%
//3)is teher any asuacide thoth (just from user ) yess no 100%
//4)fill the metric in the object{sad:0.5,angry:0.3,happy:0.2,etc}
//5)if no 1 2 3  then update the post to the right palce, clean the post_to_ai, update the metrics, update status to relevant status new/open/closed depand on the turn
//6)continue to the next post

//client
//if the post is in ai_status then disable the input

////////simulator//////////////
//add column AI_boot
//run loop that has array of 20 deferent users
//go to ai  and ask for post as the user_1
//create new users and insert data  update ai bot=1
//create new genie and  raec give the ai and respone  update ai bot=1
//do so  for all just if  update ai bot=1

//loop every 10 minuts
// 1 create user  with post from ai
//take randome new/open row. read as user or as genie  go to ai and answer
