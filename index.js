var express = require('express');
var fs = require('fs');
var hbs = require('hbs');
var http = require('http');
var async = require('async');
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var zendesk = require('node-zendesk');

var AppServer = require('./lib/AppServer');

var server = function() {
    var app = express();
    var httpServer;
    var sync;
    var applicationRoot = __dirname + (process.env.NODE_ENV === 'dev' ? '/' : '/dist/');
    var credentials;
    var templates;
    var schedules;
    var zenDeskUsers;

    app.set('view engine', 'html');
    app.set('views', applicationRoot + 'views');
    app.engine('html', hbs.__express);
    app.use("/static", express.static(applicationRoot + 'static'));

    app.get('/', function(req, res, next) {
        var viewModel = {
            templates: _.map(templates, function(template, key) {
                return { name: key };
            })
        };

        res.render('index.hbs', viewModel);
    });

    app.post('/', function(req, res, next) {
        var client = zendesk.createClient({
            username:  credentials.apiUser,
            token:     credentials.apiToken,
            remoteUri: 'https://' + credentials.subDomain + '.zendesk.com/api/v2'
        });

        client.tickets.create({
            "ticket": { 
                "subject":"TEST AUTOMATION RFC", 
                "comment": { 
                    "body": "This is a test RFC"
                },
                "metadata": {
                    "app": "myndbend_change_manager",
                    "action": "approver_added",
                    "approver_ids": [
                        "648535672"
                    ]
                }
            } 
        }, function (err, statusList, body, responseList, resultList) {
            if (err) {
                console.log(err);
                console.log(body);
                return;
            }

            fs.writeFileSync(__dirname + '/ticketOutput.json', JSON.stringify(body, null, 2, true), 'utf-8');
        });
    });

    function getUsers(callback) {
        var client = zendesk.createClient({
            username:  credentials.apiUser,
            token:     credentials.apiToken,
            remoteUri: 'https://' + credentials.subDomain + '.zendesk.com/api/v2'
        });

        client.users.list(function(err, req, result) {
            var users = _.reduce(result, function(memo, user) {
                memo[user.name] = user.id;

                return memo;
            }, {});

            callback(null, users);
        });
    }

    return {
        start: function(options, callback) {
            console.log('Starting...');

            httpServer = new AppServer(app, options);

            async.waterfall([
                    async.apply(async.parallel, [
                        async.apply(fs.readFile, __dirname + '/credentials.json', 'utf-8'),
                        async.apply(fs.readFile, __dirname + '/templates.json', 'utf-8')
                    ]),
                    function(results, callback) {
                        console.log('Loaded credentials...');
                        credentials = JSON.parse(results[0]);
                        templates = JSON.parse(results[1]);

                        callback();
                    },
                    getUsers,
                    function(users, callback) {
                        zenDeskUsers = users;

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
