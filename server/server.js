const keys = require("./keys");

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { Pool } = require("pg");
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClient.on("error", () => console.log("LOST PG CONNECTION"));

pgClient
    .query("CREATE TABLE IF NOT EXISTS values (number INT")
    .catch( err => {
        console.log(err);
    });

const redis = require("redis");

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

app.get("/", (req,res) => {
    res.send("Hello");
});

app.get("/values/all", async (req,res) => {
    const values = await pgClient.query("SELECT * FROM values");

    res.send(values.rows);
});

app.get("/values/current", async (req,res) => {
    redisClient.hgetall("values", (err, values) => {
        res.send(values);
    });
});

app.post("/values", async (req,res) => {
    const index = req.body.index;

    if(Number(index) > 40)
    {
        res.status(422).send("Index very high");
    }

    redisClient.hset("values", index, null);
    redisPublisher.publish("insert", index);
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log("APP running on port 5000");
});
