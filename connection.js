console.log("*******************************");
console.log("*** { Connection to MySql } ***");

require("dotenv").config();
const mysql = require("mysql2")

const connection = mysql.createConnection({
    host: process.env.MYSQLHOST,
    database: process.env.MYSQLDB,
    password: process.env.MYSQLPASS,
    user: process.env.MYSQLUSER,
    port: process.env.MYSQLPORT
})

connection.connect((err) => {
    if (err) {
        console.log("*******************************");
        console.log("*** { Connessione fallita } ***");
        console.log("code:", err.code);
    } else {
        console.log("*********************************************");
        console.log("*** { Connessione avvenuta con successo } ***")
    }
})

connection.query("select SYSDATE()", function (err, result, fields) {
    if (err) throw err;
    console.log("*********************************************");
    console.log(result);
});

module.exports = connection