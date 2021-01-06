const mysql = require('mysql');
const config = require('../config.json');

let con = mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.username,
    password: config.mysql.password,
    database: config.mysql.database,
    charset: 'utf8mb4',
});

con.pquery = (sql, binding = null) => {
    return new Promise((resolve, reject) => {
        con.query(sql, binding, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

module.exports = con;