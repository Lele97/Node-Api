require("dotenv").config()
require("cors");

const express = require("express")
const app = express();
const connection = require("./connection");
const https = require("https")
const httpRequest = require("http")
const limit = require("./rateLimiter")
let response = {};

app.listen(process.env.PORT, () => {
    console.log("************************************")
    console.log("*** { API Server is running... } ***")
})

app.use(express.json());

app.get("/external/demo", (req, res) => {

    req = httpRequest.request({
        method: 'GET',
        host: '127.0.0.1',
        port: 8080,
        path: '/rest',
    }, (res) => {
        const chunks = [];

        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            response = JSON.parse(Buffer.concat(chunks).toString())
            console.log(response);
        });
    }).on('error', (err) => {
        console.log("Errore :: ", err.message)
        response = err.message
    })

    req.end()

    if (req) {
        res.status(500).json({
            response: response
        })
    } else {
        res.status(200).json({
            response: response
        })
    }
})

//Richiamo una api esterna e inserisco i dati in una tabella
app.get("/external/nba-api/leagues", (req, res) => {

    req = https.request({
        method: 'GET',
        hostname: 'api-nba-v1.p.rapidapi.com',
        port: null,
        path: '/leagues',
        headers: {
            'X-RapidAPI-Key': 'b43f25494bmsh9f0f2f66c750e55p136270jsnb3c5571043cf',
            'X-RapidAPI-Host': 'api-nba-v1.p.rapidapi.com'
        }
    }, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            response = JSON.parse(Buffer.concat(chunks))
            console.log(response);
        });
    }).on('error', (err) => {
        console.log("Errore :: ", err.message)
    })

    req.end()

    res.status(200).json({
        response
    })


})

//Richiamo una api esterna e inserisco i dati in una tabella
app.get("/external/public-api/get/insert", limit, (req, res) => {
    req = https.request({
        method: 'GET',
        hostname: 'api.publicapis.org',
        port: null,
        path: '/entries',
    }, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
            chunks.push(chunk);
        });

        res.on('end', function () {
            try {
                response = JSON.parse(Buffer.concat(chunks).toString())
            } catch (err) {
                console.log("Errore :: ", err.message)
            }
        });
    }).on('error', (err) => {
        console.log("Errore :: ", err.message)
    })

    req.end()

    console.log("Conteggio entries :: " + response.count)

    createTable_PublicApi("nodejs_test_schema", "nodejs_public_api")

    insert_PublicApi(response.entries)

    res.status(200).json({
        status: res.statusCode,
        response: "Inserimento avvenuto con successo"
    })
})

function insert_PublicApi(response_data) {

    console.log("******************************************************************")
    console.log("Funzione inserimento dati response nella tabella nodejs_public_api")

    try {

        let values = []

        for (let iterator = 0; iterator < response_data.length; iterator++) {
            values.push([response_data[iterator].API, response_data[iterator].Description, response_data[iterator].Auth, response_data[iterator].HTTPS, response_data[iterator].Cors, response_data[iterator].Link, response_data[iterator].Category])
        }

        connection.query("INSERT INTO nodejs_test_schema.nodejs_public_api (API, Description, Auth, HTTPS, Cors, Link, Category) " +
            "VALUES ?", [values], (err, result) => {

            if (err) {
                console.log("*********************************************")
                console.log("Non è stato possibile completare l'operazione")
                throw new Error(err.message)
            }

            console.log("**********************")
            console.log("Inserimento completato");
            console.log("Rows affected: " + result.affectedRows);
        })

    } catch (err) {
        console.log("*********************************************")
        console.log("Non è stato possibile completare l'operazione")
        throw new Error(err.message)
    }


}

function createTable_PublicApi(schema, table_name) {

    console.log("Funzione creazione tabella " + table_name)
    console.log("Verifica esistenza tabella " + table_name)

    connection.query("SELECT EXISTS (" +
        "SELECT 1 " +
        "FROM   information_schema.tables " +
        "WHERE  table_schema =?" +
        "AND    table_name = ? ) as t;", [schema, table_name], (err, results) => {

        switch (results[0].t) {
            case 0:
                console.log("*****************************")
                console.log("La tabella non esiste la creo")
                connection.query("create table if not exists nodejs_public_api\n" +
                    "(\n" +
                    "    API         varchar(100)  null,\n" +
                    "    Description varchar(500) null,\n" +
                    "    Auth        varchar(30)  null,\n" +
                    "    HTTPS       tinyint(1)   null,\n" +
                    "    Cors        varchar(30)  null,\n" +
                    "    Link        varchar(500) null,\n" +
                    "    Category    varchar(100)  null\n" +
                    ");", table_name, (err) => {

                    if (err)
                        err.message

                    console.log("*************************")
                    console.log("La tabella è stata creata")
                })
                break;
            case 1:
                console.log("*********************")
                console.log("La tabella esiste già")
                break;
        }
    })
}



