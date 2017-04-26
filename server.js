/* MongoScraper: Boiler Plate

 * =============================================== */

// Dependencies
var express = require("express");
var exphbs = require('express-handlebars');
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var logger = require("morgan");
var path = require('path');
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

// // Requiring Comment and Article models
// var Comment = require("./models/Comment.js");
// var Article = require("./models/Article.js");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Initialize Express
var app = express();

var PORT = process.env.PORT || 7000;

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// Import routes and give the server access to them.
var routes = require('./controllers/controller');
app.use('/', routes);

// Set handlebars as view engine.
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/mongoscraperdb");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {//===========================needed in production?
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {//===========================needed in production?
  console.log("Mongoose connection successful.");
});

// Determine whether to use local or remote database connection.========production
// var connectionString;
// if (process.env.PORT) {
//     connectionString = '';
// } else {
//     connectionString = 'mongodb://localhost/mongoscraperdb';
// }

// Start listening.=================================================production
// mongoose.connect(connectionString).then(function() {
//     app.listen(PORT, function() {
//         console.log('listening on port ' + PORT);
//     });
// });

// Listen 
app.listen(PORT, function() {
  console.log("App running on port: "+ PORT);
});
