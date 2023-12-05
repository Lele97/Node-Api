require("dotenv").config()
require("cors");

const express = require("express")
const app = express();
const connection = require("./connection");
const https = require("https")
const httpRequest = require("http")
const limit = require("./rateLimiter")
const fs = require("fs")
const {v4: uuid} = require("uuid");
let response = {};

app.listen(process.env.PORT, () => {
    console.log("************************************")
    console.log("*** { API Server is running... } ***")
})

app.use(express.json());

app.get("/local/outfit", (req, res) => {
    res.send("ok")
})

app.get("/local/comments/:id", async (req, res) => {
    const id = req.params.id;
    let content;

    try {
        content = await fs.readFile("data/comments/".concat(id, ".txt"), "utf-8");
    } catch (err) {
        console.log(err)
        return res.sendStatus(process.env.NOTFOUND)
    }

    res.json({
        content: content
    });
})

app.post("/local/comments", async (req, res) => {
    const id = uuid();
    const content = req.body.content;

    if (!content)
        return res.sendStatus(204)

    await fs.mkdir("data/comments/", {
        recursive: true
    });

    await fs.writeFile("data/comments/".concat(id, ".txt"), content, {
        encoding: "utf-8"
    })

    //res.sendStatus(201);
    res.status(process.env.CREATED).json({
        id: id,
        content: content,
    })
})

app.get("/local", (req, res) => {
    connection.query("select SYSDATE()", (err, results) => {
        if (err)
            err.message

        res.status(200).json({
            results,
            User_Agent: req.get("User-Agent")
        })
    })
})

app.get("/users/:id", (req, res) => {
    res.json({
        message: req.params.id
    })
})

app.get("/home", (req, res) => {
    res.json({
        message: "this is the homepage"
    })
})

app.get("/local/create/table/test", (req, res) => {

    connection.query("SELECT EXISTS (" +
        "SELECT 1 " +
        "FROM   information_schema.tables " +
        "WHERE  table_schema = 'alphashop' " +
        "AND    table_name = 'nodejstable') as t;", (err, results, rows) => {

        switch (results[0].t) {
            case 0:
                console.log("La tabella non esiste la creo")
                connection.query("create table if not exists nodejstable\n" +
                    "(\n" +
                    "    testcolumn int null\n" +
                    ");\n", (err, results) => {

                    if (err)
                        err.message

                    res.status(200).json({
                        message: "La tabella è stata creata"
                    })
                })
                break;
            case 1:
                console.log("La tabella esiste già")
                res.status(200).json({
                    message: "La tabella esiste già"
                })
                break;
            default:
                res.send({
                    message: "default switch case"
                });
                break;
        }
    })
})

app.get("/local/articoli/custom", (req, res) => {
    connection.query("select * from articoli where CODART between 000001501 AND 000020030 AND UM = 'KG' order by IDFAMASS;", (err, result) => {
        if (err)
            res.status(204).json({
                message: err.message
            })

        res.status(200).json({
            result: result
        })
    })
})

app.delete("/local/delete/table/test", (req, res) => {

    connection.query("SELECT EXISTS (" +
        "SELECT 1 " +
        "FROM   information_schema.tables " +
        "WHERE  table_schema = 'alphashop' " +
        "AND    table_name = 'nodejstable') as t;", (err, results, rows) => {

        switch (results[0].t) {
            case 0:
                console.log("La tabella non esiste")
                res.send({
                    message: "La tabella non esiste"
                });
                break;
            case 1:
                console.log("La tabella esiste è verrà cancellata")
                connection.query("drop table if exists nodejstable;", (err, result) => {
                    if (err)
                        err.message
                    res.status(200).json({
                        message: "La tabella è stata cancellata"
                    })
                })
                break;
            default:
                res.send({
                    message: "default switch case"
                });
                break;
        }
    })
})

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

/**
 * Richiamo una api esterna e inserisco i dati in una tabella
 */
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

app.post("/external/public-api/add", async (req, res) => {

    let Value = []
    const textIntoFile = "Body usato nella request :: ".concat(JSON.stringify(req.body)).concat("\n")

    Value.push([req.body.API, req.body.Description, req.body.Auth, req.body.HTTPS, req.body.Cors, req.body.Link, req.body.Category])

    await fs.writeFile("data/body/request.txt", textIntoFile, {
        encoding: "utf8",
        flag: "a"
    }, (err) => {
        console.log("*****************************")
        console.log("Scrittura sul file completata");
        if (err)
            throw new Error(err.message)
    })

    connection.query("INSERT INTO nodejs_test_schema.nodejs_public_api (API, Description, Auth, HTTPS, Cors, Link, Category) " +
        "VALUES ?", [Value], (err, res) => {

        if (err) {
            console.log("*********************************************")
            console.log("Non è stato possibile completare l'operazione")
            throw new Error(err.message)
        }

        console.log("**********************")
        console.log("Inserimento completato");
        console.log("Rows affected: " + res.affectedRows);

    })

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



