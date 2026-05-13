'use server'

import dotenv from 'dotenv'
dotenv.config()



export const db_func = () => {
  console.log('+++++++++++++++++++++++++++++++++++++++++++')
  console.log('DB_USER:', process.env.VITE_DB_USER)
  console.log('DB_PASSWORD:', process.env.VITE_DB_PASSWORD ? '***' : 'undefined')
  console.log('DB_NAME:', process.env.VITE_DB_NAME)
  console.log('++++++++++++++++++++++++++++++++++++++++++++')
}
// postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
/*export const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
})*/
// postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
/*export const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
})*/