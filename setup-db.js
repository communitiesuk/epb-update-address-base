const { Client } = require('pg')
const dotenv = require("dotenv");
dotenv.config({});

const DB_NAME = process.env.DOCKER_POSTGRES_DATABASE || 'db-name';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PASSWORD = process.env.DOCKER_POSTGRES_PASSWORD || 'password';

async function setupDatabase() {

    const client = new Client({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        port: 5432,
    });

    await client.connect();

    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_NAME}'`);

    if (res.rowCount === 0) {
        console.log(`${DB_NAME} database not found, creating it.`);
        await client.query(`CREATE DATABASE "${DB_NAME}";`);
        console.log(`created database ${DB_NAME}.`);
        await client.query(`CREATE TABLE address_base (uprn string, postcode string, address_line1 string, address_line2 string, address_line3 string, address_line4 string, town string);`);
    } else {
        console.log(`${DB_NAME} database already exists.`);
    }

    await client.end();
}

setupDatabase();