require("dotenv").config()
require("cors");

const fs = require("fs").promises
const express = require("express")
const {v4: uuid} = require("uuid")
const app = express();
const connection = require("./connection");

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