#!/usr/bin/env node

var startStopDaemon = require('start-stop-daemon');


startStopDaemon({}, function() {

  // Start service if not already alive
  var service=require("./service.js");
  const fs = require("fs");

  require('dotenv').config();

  const PouchDB = require('pouchdb');
  const localPouch = PouchDB.defaults();
  localPouch.plugin(require('pouchdb-upsert'));
  var nodedb = new localPouch("http://localhost:"+process.env.POUCHDB_FAUXTON_PORT+"/local");

  const bootstrap=function() {
          nodedb.info().then(function (result) {
            const optionDefinitions = [
              { name: 'start', type: Boolean },
              { name: 'stop', type: Boolean },
              { name: 'restart', type: Boolean },
              { name: 'json', alias: 'j', type: String },
              { name: 'tag', alias: 't', type: String },
              { name: 'monitor', alias: 'm',type: Boolean }
            ]
            const commandLineArgs = require('command-line-args')
            const options = commandLineArgs(optionDefinitions);
            if(typeof options.json != "undefined") {
                var docname = "file";
                if(typeof options.tag != "undefined") docname=options.tag;
                var updateFile=function() {
                  var src =JSON.parse(fs.readFileSync(options.json));
                  if(typeof src._id != "undefined") delete src._id;
                  if(typeof src._rev != "undefined") delete src._rev;
                  nodedb.upsert(docname,function(orgdoc) {
                          return src;
                  }).then(function() {
                      if(typeof options.monitor != "undefined") {
                        fs.watchFile(options.json,function() {
                          updateFile();
                        });
                      }
                  });
                }
                updateFile();
            }

          }).catch(function (err) {
            service(function() {
                bootstrap();
            });
          });
  }
  bootstrap();

});
