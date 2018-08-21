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
  var nodedb = new localPouch("http://localhost:"+process.env.POUCHDB_FAUXTON_PORT+"/db/local");

  const bootstrap=function() {
          console.log("Service running - hand over to local");

          nodedb.info().then(function (result) {

            const optionDefinitions = [
              { name: 'start', type: Boolean },
              { name: 'stop', type: Boolean },
              { name: 'restart', type: Boolean },
              { name: 'json', alias: 'j', type: String },
              { name: 'tag', alias: 't', type: String },
              { name: 'monitor', alias: 'm',type: Boolean },
              { name: 'publish', alias: 'p',type: String },
              { name: 'append',alias:'a',type: Boolean}
            ]
            const commandLineArgs = require('command-line-args')
            const options = commandLineArgs(optionDefinitions);

            var opn = require('opn');

            if(typeof options.publish != "undefined") {
              console.log("***********************");
              var recursive = require("recursive-readdir");
              recursive(options.publish, function (err, files) {

                  const publishFile=function() {
                      if(files.length>0) {
                            file = files.pop();
                            nodedb.upsert(file,function(orgdoc) {
                              return {
                                _id: file,
                                _attachments: {
                                  "file": {
                                    content_type: 'text/plain',
                                    data: fs.readFileSync(file)
                                  }
                                }
                            };
                          }).then(function() { publishFile();});
                      }

                  }
                   publishFile();
              });
            }
            if(typeof options.json != "undefined") {
                var docname = "file";
                if(typeof options.tag != "undefined") docname=options.tag;
                var updateFile=function() {
                  var src =JSON.parse(fs.readFileSync(options.json));
                  if(typeof src._id != "undefined") delete src._id;
                  if(typeof src._rev != "undefined") delete src._rev;
                  if(typeof options.append == "undefined") {
                    nodedb.upsert(docname,function(orgdoc) {
                            return src;
                    }).then(function() {
                        if(typeof options.monitor != "undefined") {
                          fs.watchFile(options.json,function() {
                            updateFile();
                          });
                        }
                    });
                  } else {
                    nodedb.upsert(docname,function(orgdoc) {
                            if(typeof orgdoc.values == "undefined") orgdoc.values=[];
                            orgdoc.values.push(src);
                            return orgdoc;
                    }).then(function() {
                      if(typeof options.monitor != "undefined") {
                        fs.watchFile(options.json,function() {
                          updateFile();
                        });
                      }
                    });
                  }
                }
                updateFile();
            }
              opn('http://localhost:4009/dapp/');
          }).catch(function (err) {
            service(function() {
                bootstrap();
            });
          });
  }
  bootstrap();

});
