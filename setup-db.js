const { Client } = require('pg')
const dotenv = require("dotenv");
dotenv.config({});

const DB_NAME = process.env.DOCKER_POSTGRES_DATABASE || 'db-name';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
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
    } else {
        console.log(`${DB_NAME} database already exists.`);
    }

    const table_exists = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'address_base');`)
    if (table_exists.rows[0].exists) {
        console.log(`address_base table already exists`)
    } else {
        await client.query(`CREATE TABLE address_base (uprn varchar(255), postcode varchar(255), address_line1 varchar(255), address_line2 varchar(255), address_line3 varchar(255), address_line4 varchar(255), town varchar(255));`);
        console.log(`created table address_base`)
    }

    const table_exists2 = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'address_base');`)
    console.log(`Results of second table exists - ${table_exists2.rows[0].exists}`)

    await client.end();
}

setupDatabase();