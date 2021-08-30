const mysql = require('mysql2/promise');
import { URL } from "url";

export class Database
{
    mysqlSettings: any

    constructor()
    {
        const databaseUrl: string | undefined = process.env.DATABASE_URL;
        if (databaseUrl === void 0) throw 'DATABASE_URL is undefined.';

        const url = new URL(databaseUrl);
        this.mysqlSettings = {
            host: url.hostname,
            user: url.username,
            password: url.password,
            database: url.pathname.substr(1),
        }
    }

    public async getUserUseCount(user_id: number): Promise<number>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const [rows] = await connection.query("SELECT use_count FROM users WHERE user_id = ?", user_id);
            if (rows.length > 0) return rows[0].use_count;
            else return -1;
        }
        catch(e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }
}