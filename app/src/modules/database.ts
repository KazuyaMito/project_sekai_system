import mysql from 'mysql2/promise';
import { URL } from "url";

export class Database
{
    mysqlSettings: mysql.ConnectionOptions

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

    public async getUserUseCount(userId: number): Promise<number | undefined>
    {
        const connection: mysql.Connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT use_count FROM users WHERE user_id = ?", userId);
            if (rows.length > 0) return rows[0].use_count;
            else return undefined;
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

    public async addUser(userId: number, mentionName: string, useCount: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "INSERT INTO users (user_id, user_name, use_count) VALUES (?, ?, ?)";
            const params = [userId, mentionName, useCount];

            await connection.beginTransaction()
            await connection.query(sql, params);
            await connection.commit();
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async updateUserUseCount(userId: number, mentionName: string, useCount: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT user_id FROM users WHERE user_id = ?";
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, userId);

            await connection.beginTransaction();
            if(rows.length <= 0)
            {
                const insertSql = "INSERT INTO users (user_id, user_name, use_count) VALUES (?, ?, ?)";
                const insertParams = [userId, mentionName, useCount];
                await connection.query(insertSql, insertParams);
                await connection.commit();
            }
            else
            {
                const updateSql = "UPDATE user SET use_count = ? WHERE user_id = ?";
                const updateParams = [useCount, userId];
                await connection.query(updateSql, updateParams);
                await connection.commit();
            }
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async getUsers(): Promise<mysql.RowDataPacket[] | undefined>
    {
        const connection: mysql.Connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT user_name, use_count FROM users";
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql);
            if (rows.length > 0)
            {
                return rows;
            }
            else return undefined;
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

    public async deleteAllUsers(): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            await connection.beginTransaction();
            await connection.query("TRUNCATE TABLE users");
            await connection.commit();
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

    public async getGuild(guildId: number): Promise<mysql.RowDataPacket[] | undefined>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT is_multi_line_read, is_name_read, read_limit FROM guilds WHERE id = ?";
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, guildId);
            if (rows.length > 0) return rows;
            else return undefined;
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async addGuild(guildId: number, name: string): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "INSERT INTO guilds (id, name) VALUES (?, ?)";
            const params = [guildId, name];
            await connection.beginTransaction();
            await connection.query(sql, params);
            await connection.commit();
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async setReadName(readable: boolean, guildId: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "UPDATE guilds SET is_name_read = ? WHERE id = ?";
            const params = [readable, guildId];
            await connection.beginTransaction();
            await connection.query(sql, params);
            await connection.commit();
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async setReadMultiLine(readable: boolean, guildId: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "UPDATE guilds SET is_multi_line_read = ? WHERE id = ?";
            const params = [readable, guildId];
            await connection.beginTransaction();
            await connection.query(sql, params);
            await connection.commit();
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async getDictionary(word: string, guildId: number): Promise<number | undefined>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT id FROM dictionaries WHERE word = ? AND guild_id = ?";
            const params = [word, guildId];
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, params);

            if (rows.length > 0) return rows[0].id;
            else return undefined;
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async getDictionaries(guildId: number): Promise<mysql.RowDataPacket[] | undefined>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT dictionaries.word, dictionaries.read FROM dictionaries WHERE dictionaries.guild_id = ?";
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, guildId);

            if(rows.length > 0) return rows;
            else return undefined;
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

    public async addDictionary(word: string, read: string, guildId: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "SELECT id FROM dictionaries WHERE word = ?";
            const [rows] = await connection.query<mysql.RowDataPacket[]>(sql, word);

            await connection.beginTransaction();
            if(rows.length <= 0)
            {
                const insertSql = "INSERT INTO dictionaries (dictionaries.word, dictionaries.read, dictionaries.guild_id) VALUES (?, ?, ?)";
                const insertParams = [word, read, guildId];
                await connection.query(insertSql, insertParams);
                await connection.commit();
            }
            else
            {
                const updateSql = "UPDATE dictionaries SET dictionaries.read = ? WHERE dictionaries.id = ?";
                const updateParams = [word, read];
                await connection.query(updateSql, updateParams);
                await connection.commit();
            }
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async deleteDictionary(id: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "DELETE FROM dictionaries WHERE id = ?";
            await connection.beginTransaction();
            await connection.query(sql, id);
            await connection.commit();
        }
        catch (e)
        {
            throw e;
        }
        finally
        {
            connection.end();
        }
    }

    public async setReadLimit(limit: number, guildId: number): Promise<void>
    {
        const connection = await mysql.createConnection(this.mysqlSettings);
        try
        {
            const sql = "UPDATE guilds SET guilds.read_limit = ? WHERE guilds.id = ?";
            const params = [limit, guildId];
            await connection.beginTransaction();
            await connection.query(sql, params);
            await connection.commit();
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