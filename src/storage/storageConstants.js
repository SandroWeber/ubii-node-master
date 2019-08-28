const path = require('path');

const BASE_FOLDER_LOCAL_DB = process.env['HOME'] + '/.opt/ubii/db';
const BASE_FOLDER_ONLINE_DB = path.join(__dirname, '../../node_modules/@tum-far/ubii-database').normalize();

module.exports = {
  BASE_FOLDER_LOCAL_DB: BASE_FOLDER_LOCAL_DB,
  BASE_FOLDER_ONLINE_DB: BASE_FOLDER_ONLINE_DB
};