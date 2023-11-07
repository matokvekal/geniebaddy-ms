import Sequelize from 'sequelize';
import { configByEnv } from './config.js';

const mode = process.env.MODE || 'development';
const dbConfig = configByEnv[mode].database;

describe("Server Tests", () => {

    let sequelize;

    beforeEach(() => {
        sequelize = new Sequelize(
            dbConfig.NAME,
            dbConfig.USER,
            dbConfig.PASSWORD,
            {
                host: dbConfig.HOST,
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
            },
        );
    });

    afterEach(() => {
        sequelize.close();
    });

    it("should connect to the database successfully", async () => {
        let isAuth = false;
        try {
            await sequelize.authenticate();
            isAuth = true;
        } catch (error) {
            isAuth = false;
        }
        expect(isAuth).toBe(true);
    });

    it("should execute SQL without errors", async () => {
        let isError = false;
        try {
            const SQL = `UPDATE genie_posts SET post_status='new',
                        status_time=UTC_TIMESTAMP(),
                        genie_id=0  
                        WHERE post_status="hold" 
                        AND status_time <UTC_TIMESTAMP() - INTERVAL 10 MINUTE 
                        and is_block=0 and is_active=1`;
            await sequelize.query(SQL);
        } catch (error) {
            isError = true;
        }
        expect(isError).toBe(false);
    });

   //  it("should execute stored procedure without errors", async () => {
   //      let isError = false;
   //      const company_id = 'sample_company_id'; // Replace with a valid company_id for testing
   //      try {
   //          await sequelize.query(
   //              `CALL \`${dbConfig.NAME}\`.remove_resource_duplicate('${company_id}');`
   //          );
   //      } catch (error) {
   //          isError = true;
   //      }
   //      expect(isError).toBe(false);
   //  });
});
