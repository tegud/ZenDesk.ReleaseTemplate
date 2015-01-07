var express = require('express');
var fs = require('fs');
var hbs = require('hbs');
var http = require('http');
var async = require('async');
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');

var AppServer = require('./lib/AppServer');

var server = function() {
    var app = express();
    var httpServer;
    var sync;
    var applicationRoot = __dirname + (process.env.NODE_ENV === 'dev' ? '/' : '/dist/');
    var credentials;
    var schedules;

    app.set('view engine', 'html');
    app.set('views', applicationRoot + 'views');
    app.engine('html', hbs.__express);
    app.use("/static", express.static(applicationRoot + 'static'));

    app.get('/', function(req, res, next) {
        res.render('index.hbs');
    });

    app.post('/', function(req, res, next) {
        
        
        res.render('done.hbs');
    });

    return {
        start: function(options, callback) {
            console.log('Starting...');

            httpServer = new AppServer(app, options);

            async.waterfall([
                    async.apply(async.parallel, [
                        async.apply(fs.readFile, __dirname + '/credentials.json', 'utf-8'),
                    ]),
                    function(results, callback) {
                        console.log('Loaded credentials...');
                        credentials = JSON.parse(results[0]);

                        callback();
                    },
                    httpServer.start, 
                ],
                function(err, http, socket) {
                    (callback || function() {})(err);
                });
        },
        stop: function(callback) {
            httpServer.stop(callback);
        }
    };
};

if(require.main === module) {
    new server().start({
        port: 1234
    });
}

module.exports = server;
