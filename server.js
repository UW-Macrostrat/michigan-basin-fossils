var express = require('express'),
  getRoutes = require('./routes/get_router'),
  postRoutes = require('./routes/post_router'),
  cons = require('consolidate'),
  mysql = require('mysql'),
  config = require("./routes/config"),
  app = express();

//connection = mysql.createPool(config.credentials);
conn = mysql.createConnection(config.credentials);

// assign the Mustache engine to .html files
app.engine('html', cons.mustache);

// set .html as the default extension for views
app.set('view engine', 'html');
 
// Identify where the view templates live
app.set('views', __dirname + '/views');

// Point the server to static files in the /public dir
//app.use(express.static('/Library/WebServer/Documents/mibasin'));
app.use(express.static('public'));

// GZIP responses
app.use(express.compress());
// Ensures we can read the parameters of a POST request
app.use(express.bodyParser({uploadDir: __dirname + '/uploads'}));
app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);

app.enable('trust proxy');

// Check if user is logged in on certain routes
function checkAuth(req, res, next) {
  if (!req.session.user_id) {
    res.redirect('/');
  } else {
    next();
  }
}

function logErrors(err, req, res, next) {
	console.error(err.stack);
	next(err);
}

function clientErrorHandler(err, req, res, next) {
	next(err);
}

function errorHandler(err, req, res, next) {
	res.status(500);
	res.render('error', { error: err });
}

// Simple page routes
app.get('/', getRoutes.root);

app.get('/map', getRoutes.map);
app.get('/faq', getRoutes.faq);
app.get('/about', getRoutes.about);
app.get('/aboutus', getRoutes.aboutus);
app.get('/legal', getRoutes.legal);
app.get('/viewrecord/:id', getRoutes.viewrecord);
app.get('/stats', getRoutes.statPage);

// Log in and out
app.post('/login', postRoutes.login);
app.get('/logout', getRoutes.logout); 

// Search routes
app.post('/simpleSearch', postRoutes.simpleSearch); // Simple search box route
app.get('/simpleSearch', getRoutes.simpleSearch); // Simple search box route
app.post('/search', postRoutes.searchPost); // Search form always POSTS first and stores params in a session cookie
app.get('/search', getRoutes.searchApp);  // Used for paging through search results (uses session cookie)
app.get('/search/recent', getRoutes.searchRecent); // View recent photos ("Browse" button)
app.get('/advancedSearch', getRoutes.advancedSearch); // For full search form

// Data feeders for page content
app.get('/api/photos/county/:id', getRoutes.findByCounty); // Find all photos in a county on click
app.get('/api/photoTaxa', getRoutes.photoTaxa); // Get the name associated with the ID of a taxon (for PBDB)
app.get('/api/map', getRoutes.mapData); // Get number of photos in each county
app.get('/api/stats', getRoutes.stats); // Get summary statistics for the homepage
app.get('/api/photos/random/:id', getRoutes.randomPhotos); // Get any number of random photos
app.get('/api/autocomplete', getRoutes.autocomplete); // Autocomplete search feeder
app.get('/api/userstats', getRoutes.user_contributions); // User contribution summary
app.get('/api/datestats', getRoutes.monthly_stats); // Database uploads by month

// Upload form helpers
app.get('/upload', checkAuth, getRoutes.upload); // Upload form route ** Secured **
app.get('/api/getCounties', getRoutes.getCounties); // Find all counties in a given state
app.get('/api/getCities', getRoutes.getCities);  // Find all cities in a given county
app.get('/api/verifyTaxa', getRoutes.verifyTaxa); // Check if taxa exists in UMMP database
app.post('/upload', checkAuth, postRoutes.upload); // POST filled out form to server ** Secured **
app.get('/editRecord/:id', checkAuth, getRoutes.editRecord); // Edit an existing record
app.post('/editRecord', checkAuth, postRoutes.editRecord); // Process the editing of a record
app.post('/deleteRecord/:id', checkAuth, postRoutes.deleteRecord); // Delete an existing record
app.post('/addComment', checkAuth, postRoutes.comment); // Add a comment to a photo
app.post('/editComment', checkAuth, postRoutes.editComment); // Edit a photo comment
app.post('/deleteComment', checkAuth, postRoutes.deleteComment); // Delete a comment


// Handle 404
app.use(function(req, res) {
   res.send('404: Page not Found', 404);
});

// Handle 500
app.use(function(error, req, res, next) {
   res.send('500: Internal Server Error', 500);
});

app.listen(8080);

console.log('Listening on port 8080...');