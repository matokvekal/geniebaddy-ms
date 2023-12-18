import cron from "node-cron";
import Sequelize from "sequelize";
import configByEnv from "./config.js";
const mode = process.env.MODE || "development";
const dbConfig = configByEnv.database;
import moment from "moment";
import OpenAI from "openai";
const openai = new OpenAI();
const openai_api_key = configByEnv.OPEN_AI_KEY;

let counter = 0;
openai.api_key = openai_api_key;
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

class AnalysisResult {
  constructor() {
    this.riskAssessment = {
      violence: 0,
      suicide_self_harm: 0,
      violates_privacy: 0,
      contains_hate_speech: 0,
      sexual_violence: 0,
    };
    this.emotionalState = {
      bad_mood: 0,
      self_esteem: 0,
      anxiety: 0,
      stress: 0,
      loneliness: 0,
      sadness: 0,
      anger: 0,
      frustration: 0,
      disappointment: 0,
      fear: 0,
    };
  }
  updateData(newData) {
    if (newData && newData.riskAssessment) {
      Object.assign(this.riskAssessment, newData.riskAssessment);
    }
    if (newData && newData.emotionalState) {
      Object.assign(this.emotionalState, newData.emotionalState);
    }
  }
}

async function checkIfShouldRun() {
  try {
    console.log("at checkIfShouldRun");
    const SQL = `
      SELECT COUNT(*) as count 
      FROM genie_posts 
      WHERE ( post_status = 'user_ai' or post_status = 'genie_ai')
      and is_active = 1 and ai_post_status ='new'`;
    const results = await sequelize.query(SQL, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const count = results[0].count;

    if (count > 0) {
      console.log(`Found ${count} records to update.`);
      return true;
    } else {
      console.log("No records to update.");
      return false;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function ai(row) {
  console.log("at ai");
  let messages = "";
  if (row.aiPostWriter === "user_1") {
    messages = [
      {
        role: "system",
        content:
          "You are an AI psychological expert tasked with analyzing user text.",
      },
      {
        role: "assistant",
        content: `Analyze user text for inappropriate content or personal data. Redact any identifiable data. Assess the text for content and context.if the text in other languages like hebrew then check it and fill the answer  at english as well
          you have to check the user text  for each of the riskAssessment and the emotionalState properties and give mark as number from 0 to 5 (0 is no such mening in the text 5- is very most and 2-4 is middle)
           `,
      },
      {
        role: "assistant",
        content:
          "Return only the JSON 'riskAssessment' and 'emotionalState'. No additional text.attached the an example input for user text analysis. YOU as AI model have to only return those 2 objects: riskAssessment and emotionalState. and nothing else.replace the 0 with the number that you found per each if neded from 0 less to 5 max",
      },
      {
        role: "user",
        content: `${row.post}`,
      },
      {
        role: "assistant",
        content: `{
          "riskAssessment": {
            "violence": 0,            
            "suicide_self_harm": 0,  
            "violates_privacy": 0,   
            "contains_hate_speech": 0,
            "sexual_violence": 0      
          },
          "emotionalState": {
            "bad_mood": 0,            
            "self_esteem": 0,         
            "anxiety": 0,             
            "stress": 0,              
            "loneliness": 0,          
            "sadness": 0,             
            "anger": 0,               
            "frustration": 0,         
            "disappointment": 0,      
            "fear": 0                 
          }
        }`,
      },
    ];
  } else {
    //not tested yet
    messages = [
      {
        role: "system",
        content:
          "You are an AI psychological expert tasked with analyzing user text.",
      },
      {
        role: "assistant",
        content:
          "Analyze user text for inappropriate content or personal data. Redact any identifiable data. Assess the text for content and context.",
      },
      {
        role: "assistant",
        content:
          "return JSON 'riskAssessment' with properties indicating the presence of specific content types. Each property should be a number from 0 (none) to 5 (maximum presence). The properties are: 'violence', 'suicide_self_harm', 'violates_privacy', 'contains_hate_speech', 'sexual_violence'.",
      },
      {
        role: "assistant",
        content: `Here example input for user text analysis:
          riskAssessment: {
            violence: 0,            
            suicide_self_harm: 0,   
            violates_privacy: 0,    
            contains_hate_speech: 0,
            sexual_violence: 0      
          }`,
      },
    ];
  }

  const completion = await openai.chat.completions.create({
    messages: messages,
    model: "gpt-3.5-turbo",
  });
  console.log(completion.choices[0]);
  return completion.choices[0];
}

async function prepareAi() {
  console.log("at prepareAi");
  try {
    const [result] = await sequelize.query("CALL genie_prepare_ai();");
    if (result && result.rowId && result.aiPostWriter) {
      return result;
    } else {
      console.log("at prepareAi - no data");
      return null;
    }
  } catch (error) {
    console.error("Error at prepareAi", error);
    return null;
  }
}

function isHighRisk(data) {
  for (let key in data) {
    if (data[key] === 5) {
      return true;
    }
  }
  return false;
}

async function updateAiToDb(aiResult, row) {
  try {
    ///for user_1 ONLY

    let analysisResult = new AnalysisResult();
    let newData;
    if (aiResult && aiResult.message && aiResult.message.content) {
      try {
        newData = JSON.parse(aiResult.message.content);
      } catch (e) {
        console.error("Invalid JSON format:", e);
        return;
      }
      analysisResult.updateData(newData);
    }
    //if we are in user_1 do:
    //read the results
    //if ok
    let postStatus = "ok";
    let highRisk = false;
    if (isHighRisk(analysisResult.riskAssessment)) {
      postStatus = "blocked by code due to abuse";
      highRisk = true;
    }
    const SQL = `
    UPDATE genie_ai_results
    SET
      violence = :violence,
      suicide_self_harm = :suicide_self_harm,
      violates_privacy = :violates_privacy,
      contains_hate_speech = :contains_hate_speech,
      sexual_violence = :sexual_violence,
      bad_mood = :bad_mood,
      self_esteem = :self_esteem,
      anxiety = :anxiety,
      stress = :stress,
      loneliness = :loneliness,
      sadness = :sadness,
      anger = :anger,
      frustration = :frustration,
      disappointment = :disappointment,
      fear = :fear,
      post_status = :post_status,
      ai_finish = UTC_TIMESTAMP()
    WHERE post_id = :post_id`;

    await sequelize.query(SQL, {
      replacements: {
        ...analysisResult.riskAssessment,
        ...analysisResult.emotionalState,
        post_status: postStatus,
        post_id: row.rowId,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });
    //////DESISION/////////////////
    let SQL2 = "";
    if (highRisk) {
      SQL2 = `UPDATE genie_posts 
                SET ai_post_status = 'blocked by code due to abuse', 
                    user_read = 0, 
                    genie_read = 0,
                    post_status = 'closed',
                    user_1 = 'Post blocked due to abuse'
                WHERE id = ${row.rowId}`;
    } else {
      // Assuming row.aiPostWriter is a column name. If it's a value, enclose it in quotes.
      SQL2 = `UPDATE genie_posts 
                SET post_status = post_status_after_ai,
                    post_status_after_ai = NULL,
                    ${row.aiPostWriter} = ai_post,
                    ai_post_status = 'finish', 
                    status_time = UTC_TIMESTAMP()
                WHERE id = ${row.rowId} AND ai_post_status = 'working'`;
    }

    await sequelize.query(SQL2, {
      type: Sequelize.QueryTypes.UPDATE,
    });
  } catch (e) {
    console.log(e);
  }
}

async function run() {
  console.log(
    "starting  Ai service...",
    moment.utc().format("DD-MM-YYYY HH:mm:ss")
  );
  try {
    const row = await prepareAi();
    if (!row) {
      return false;
    }
    const aiResult = await ai(row);
    if (!aiResult) {
      return false;
    }
    const update = await updateAiToDb(aiResult, row);
  } catch (error) {
    console.error("Error executing SQL:", error);
  }
}

async function runAndUpdate() {
  try {
    while (true) {
      counter++;
      const shouldRun = await checkIfShouldRun();
      console.log("shouldRun:", shouldRun, "Counter:", counter);
      if (!shouldRun) {
        console.log("Sleeping for 1 minute... run=", counter);
        await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000)); // Sleep for 1 minute (60 seconds)
      } else {
        await run();
      }
    }
  } catch (e) {
    console.error("Error occurred:", e);
  }
}

// Start the loop
runAndUpdate();

/////////////////////
/////server                        ??????????????????????????????????- finish     just to test
//server new postcheck config array ['user_1','user_2','user_3','genie_1','genie_2','genie_3']
// if array.lenth===0 do nothing
//else if current user/genie is not in array continu
//else if current user/genie is in array then update post status to AI_USER / or AI_GENIE
//update the post to post_ai
//update all the rest as well, but in the user_X or genie_X update "post is checking"

/////service??????????in progress
//this service check if post_status=AI_USER or AI_GENIE, if so
//get the post
//2 diferent usecase:1)last_writen_by='user_1'and its first post  then we also have to ask for metrics,
// else we just ask for answer,
//send to ai
//wait for response
//qw are asking the ai  for:
//1)is there personal details that can recognize the user/genie (name, phone, email, address, etc)   yess or no be sure 100%
//2)is there any bad words in the post? קללות אלימות,מיניות טרור השצות ניצול רמאות  yess no 100%
//3)is teher any asuacide thoth (just from user ) yess no 100%
//4)fill the metric in the object{sad:0.5,angry:0.3,happy:0.2,etc}
//5)if no 1 2 3  then update the post to the right palce, clean the post_to_ai, update the metrics, update status to relevant status new/open/closed depand on the turn
//6)continue to the next post

// Anxiety: Signs of worry, nervousness, or unease.
// Depression: Indicators of deep sadness, hopelessness, or loss of interest.
// Anger: Expressions of irritation, frustration, or rage.
// Fear: Feelings of being scared or frightened.
// Joy: Expressions of happiness, pleasure, or satisfaction.
// Hope: Signs of optimism or looking forward to the future.
// Loneliness: Indications of feeling alone or isolated.
// Stress: Signs of being overwhelmed or unable to cope.
// Resilience: Ability to recover from difficulties.
// Self-esteem: Indicators of self-worth or self-respect.
// Empathy: Understanding and sharing the feelings of others.
// Guilt: Feelings of having done wrong or failed obligations.
// Shame: Sense of humiliation or distress caused by awareness of wrong behavior.
// Gratitude: Expressions of thankfulness and appreciation.
// Love: Affectionate and deep feelings towards someone or something.
// Sadness: Expressions of unhappiness or sorrow.
// Regret: Feelings of disappointment or remorse about past actions.
// Confusion: Signs of being unable to think clearly or to understand.
// Indifference: Lack of interest, concern, or sympathy.
// Motivation: Drive to achieve goals or to act in a certain way.
// Fatigue: Signs of tiredness or exhaustion.
// Trust: Belief in the reliability, truth, or ability of someone or something.
// Jealousy: Feelings of envy towards another person's achievements or advantages.
// Optimism: Hopefulness and confidence about the future.
// Pessimism: Tendency to see the worst aspect of things or believe that the worst will happen.
// Nostalgia: Sentimental longing for the past.
// Conflict: Signs of disagreement or discord.
// Coping Strategies: Ways of dealing with difficult situations.
// Mental Focus/Concentration: Ability to maintain attention and focus.
// Physical Pain: Indications of bodily discomfort or suffering.

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
