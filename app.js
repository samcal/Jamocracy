// include node modules
'use strict';

const fs = require('fs'),
    bodyParser = require('body-parser'),
    express = require('express'),
    cookieParser = require('cookie-parser'),
    app = express(),
    port = (process.env.PORT || '5000'),
    routeFiles = fs.readdirSync('routes');
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

routeFiles.forEach(routeFile => {
    if (routeFile.indexOf('.js') === -1) {
        return;
    }

    const route = require('./routes/' + routeFile.replace('.js', ''));
    route.setup(app);
});

app.listen(port, () => {
    console.log('Jamocracy started on port', port);
});

