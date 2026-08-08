import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

export const pool = mysql.createPool({
  host:            env.db.host,
  user:            env.db.user,
  password:        env.db.password,
  database:        env.db.name,
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           'Z',
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
