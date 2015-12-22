// include node modules
var twilio = require('twilio')('ACdc7d3faac00d72c93a830191947c999a', 'dccfe5571db0d393c727cee38b68a730');
var bodyParser = require('body-parser');
var path = require('path');
var express = require('express');
var request = require('request');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var SpotifyWebApi = require('spotify-web-api-node');
var redis = require('redis');

var redisclient = redis.createClient('50.129.125.139', 6379);

redisclient.on('connect', function() {
	console.log('connected to Database');
});

// Set credentials, scope, and state
var credentials = {
  clientId : '0095976fe9c24fc5a6e4a7559e01f37e',
  clientSecret : '967795bf432646f69797a1a7e7d97a0e',
  redirectUri : 'http://jamocracy.herokuapp.com/callback'
};

var scopes = ['playlist-read-private', 'playlist-modify-public', 'playlist-modify-private', 'user-read-private'];
var stateKey = 'spotify_auth_state';

// Create the spotifyApi object and theauthorization URL
var spotifyApi = new SpotifyWebApi(credentials);
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, stateKey);

// Set up node app and server
var app = express();
var port = (process.env.PORT || 8080);
var server = app.listen(port);
app.use(express.static(__dirname + '/public')).use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


// Redirect to Spotify authortization when user presses login
app.get('/login', function(req, res) {
  res.redirect(authorizeURL);
});


// After the user logs in through Spotify, save access and refresh tokens and
// redirect user to info.html, which contains the form
app.get('/callback', function(req, res) {
  spotifyApi.authorizationCodeGrant(req.query.code)
    .then(function(data) {
      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(data.body.access_token);
      spotifyApi.setRefreshToken(data.body.refresh_token);
      res.redirect('/info.html');
  }, function(err) {
    console.log('Something went wrong in callback get!', err);
  });
});


// When the user sumbits the form, create the new playlist and redirect user
// to the success page
app.post('/callback', function(req, res) {
  var phoneNumber = req.body.phoneNumber;
  var playlistName = req.body.playlistName;
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.getMe()
      .then(function(data) {
        spotifyApi.createPlaylist(data.body.id, playlistName, { 'public' : false })
          .then(function(data) {
            console.log('Created playlist!');
			request.post('https://jamocracy.herokuapp.com/success', {form:{number:phoneNumber}});
			res.redirect('/success.html');		
            }, function(err) {
            console.log('Something went wrong in create playlist!', err);
          });
        }, function(err) {
          console.log('Something went wrong in callback post!', err);
        });
      });
});


app.post('/success', function(req, res) {
	var randString = 'QWER';
	twilio.messages.create({ 
		to: req.body.number, 
		from: "+16305818347", 
		body: "This is your Jamocracy Number! Have your friends text their suggestions here! Party Code:"+randString
	}, function(err, message) { 
		console.log(message.sid); 
	});
	redisclient.sadd(randString, req.body.number);
});


app.post('/SMS', function(req, res) {

	request('https://api.spotify.com/v1/search?type=track&limit=1&q='+encodeURIComponent(req.body.Body), function(error, response, body) {
			if(error){
				twilio.messages.create({ 
					to: req.body.From, 
					from: "+16305818347", 
					body: "Sorry! There was an error" 
				}, function(err, message) { 
					console.log(message.sid); 
				});
			} else {
				var songObj = JSON.parse(body);
				twilio.messages.create({ 
					to: req.body.From, 
					from: "+16305818347", 
					body: "Song added: "+songObj.tracks.items.name
				}, function(err, message) { 
					console.log(message.sid); 
				});
			}
	});
});

