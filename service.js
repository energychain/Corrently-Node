'use strict';

module.exports = async function(cbmain) {

  const { createLogger, format, transports } = require('winston');
  const { combine, timestamp, label, printf } = format;

  const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
  });

  const logger = createLogger({
    level: 'info',
    format: combine(
      label({ label: 'Corrently-Node' }),
      timestamp(),
      myFormat
    ),
    transports: [
      new transports.File({ filename: 'info.log', level: 'info' }),
      new transports.Console()
    ]
  });

  var init = require("./init.js");
  init(async function(cb) {

        Error.stackTraceLimit = Infinity;
        require('dotenv').config();
        const IPFS = require('ipfs')
        const OrbitDB = require('orbit-db')
        const fs = require("fs");
        const ethers = require("ethers");
        const PouchDB = require('pouchdb');
        const localPouch = PouchDB.defaults({prefix: process.env.DATADIR});
        const express = require('express');
        const wallet = new ethers.Wallet(process.env.PRIVATEKEY);

        const ipfsOptions = {
          EXPERIMENTAL: {
            pubsub: true
          }
        }
        logger.info("Authority Node Address "+process.env.ACCOUNT);

        const ipfs = new IPFS(ipfsOptions)
        const ANNOUNCEMENT_CHANNEL=process.env.ANNOUNCEMENT_CHANNEL;
        var subscribtions={};

        const publish=async function(kv,change) {
          var nodedb = new localPouch(process.env.ACCOUNT);
          if(typeof change=="undefined"){
              nodedb.get(process.env.NODECLASS).then(async function(obj) {
                // Add Swarm Info to main DATA Doc
                obj.swarm={};
                var peers=process.env.SWARM.split(",");
                obj.swarm.PEERS=peers;
                obj.swarm.IDLE_REPUBLISH=process.env.IDLE_REPUBLISH;
                obj.swarm.IDLE_ANNOUNCEMENT=process.env.IDLE_ANNOUNCEMENT;
                obj.swarm.E20CONTRACT=process.env.E20CONTRACT;
                obj.swarm.SWARM_RECONNECT=process.env.SWARM_RECONNECT;
                obj.swarm.SWARM_ID=process.env.IPFS_ID;
                obj._publishTimeStamp=new Date();
                await kv.set(obj._id,obj);
            }).catch(async function(err) {
              logger.info("Try publish without document? - we create an epmty document" + err);
              var obj={};
              obj.swarm={};
              var peers=process.env.SWARM.split(",");
              obj.swarm.PEERS=peers;
              obj.swarm.IDLE_REPUBLISH=process.env.IDLE_REPUBLISH;
              obj.swarm.IDLE_ANNOUNCEMENT=process.env.IDLE_ANNOUNCEMENT;
              obj.swarm.E20CONTRACT=process.env.E20CONTRACT;
              obj.swarm.SWARM_RECONNECT=process.env.SWARM_RECONNECT;
              obj.swarm.SWARM_ID=process.env.IPFS_ID;
              obj._id=process.env.NODECLASS;
              await nodedb.put(obj);
            });
          } else {
            const orbitdb = new OrbitDB(ipfs);
            const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);
            var signature=wallet.signMessage(kv.address.toString());
            announcement.add({peer:kv.address.toString(),signature:signature,account:wallet.address,doc:change._id,swarm:process.env.IPFS_ID});
            logger.info("Pubslished " +change);
            change._publishTimeStamp=new Date();
            await kv.set(change._id,change);
          }
        }

        const subscribePeer=async function(item) {
          var peer = item.peer;
          var e20abi=[  {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}];
          var contract = new ethers.Contract(process.env.E20CONTRACT, e20abi,ethers.providers.getDefaultProvider("homestead"));
          if(typeof item.swarm != "undefined") {
                ipfs.swarm.connect(item.swarm).then(function() { logger.info("Connected Swarm Peer "+item.swarm); connectPeer();}).catch(function() { logger.info("Failed Swarm Peer "+item.swarm);});
          }
          contract.balanceOf(item.account).then(async function(balance) {
            var sign_address = ethers.Wallet.verifyMessage(item.peer, item.signature);
              if((balance>0)&&(sign_address==item.account)&&(sign_address!=wallet.address)) {
                logger.info("Added Peer " + item.account+ " "+item.doc);
                const orbitdb = new OrbitDB(ipfs);
                const kv = await orbitdb.keyvalue(peer);
                await kv.load();
                kv.events.on('replicated', (address) => {
                    const v = kv.get(item.doc);
                    if(typeof v._publishTimeStamp!="undefined") {
                        v.publishTimeStamp=v._publishTimeStamp;
                        delete v._publishTimeStamp;
                    }
                    logger.info("Updated "+peer +" "+item.account,item.doc);

                    var doc= process.env.NODECLASS;
                    if(typeof item.doc != "undefined") doc = item.doc;
                    if(typeof v._id != "undefined") doc=v._id;

                    var db = new localPouch(item.account);
                    db.get(doc).then(function(dbdoc) {
                      v._rev=dbdoc._rev;
                      v._id=item.doc;
                      return db.put(v);
                    }).then(function(response) {
                      db.compact().then(function (result) {
                      }).catch(function (err) {
                      });
                    }).catch(function (err) {
                      if(typeof v._rev != "undefined") delete v._rev;
                      return db.put(v).catch(function(e) {logger.info("Insert",e,item.account,item.doc)});
                    });
                });
              } else {
                logger.info("Ignored peer ",item.account,item.peer);
              }
          });
        }

        const subscribeAnnouncements=async function(kv) {
              const orbitdb = new OrbitDB(ipfs);
              const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);

              const refreshItems = function() {
                const items = announcement.iterator({ limit: 100 })
                  .collect()
                  .map((e) => e.payload.value);
                  logger.info("Refreshing "+items.length+" Announcements");
                  var swarmPeers=[];
                  for(var i=0;i<items.length;i++) {
                    if(typeof subscribtions[items[i].peer+"/"+items[i].doc] == "undefined") {
                      subscribtions[items[i].peer+"/"+items[i].doc]=items[i].account;
                      subscribePeer(items[i]);

                      if((typeof items[i] != "undefined")&&(typeof items[i].swarm != "undefined")) {
                        swarmPeers.push(items[i].swarm)
                      }
                    }
                  }
                    var connectSwarms=function() {
                          if(swarmPeers.length>0) {
                              var peer = swarmPeers.pop();
                              ipfs.swarm.connect(peer).then(function() {
                                logger.info("Connected Swarm Peer "+peer); connectPeer();
                                connectSwarms();
                              }).catch(function() {
                                logger.info("Failed Swarm Peer "+peer);
                                connectSwarms();
                              });
                          }
                      }
                      connectSwarms();

              }

              var announceThis=function() {
                var signature=wallet.signMessage(kv.address.toString());
                announcement.add({peer:kv.address.toString(),signature:signature,account:wallet.address,doc:process.env.NODECLASS,swarm:process.env.IPFS_ID});
              };

              setInterval(announceThis,process.env.IDLE_ANNOUNCEMENT);
              announceThis();

              logger.info("Announcement Channel "+announcement.address.toString());

              announcement.events.on('replicated', (address) => {
                logger.info("Announcement Event "+address);
                refreshItems();
              })
              refreshItems();
        }

        // Main Process starts here...

        ipfs.on('error', (e) => console.error(e))
        ipfs.on('ready', async () => {
          logger.info("IPFS Daemon ready");
          ipfs.id(function(err,id) {
              process.env.IPFS_ID="/ip4/"+process.env.EXTERNAL_IP+"/tcp/4002/ipfs/"+id.id;
              logger.info("IPFS ID "+process.env.IPFS_ID);
          });

          const app = express();
          PouchDB.defaults({prefix: ''});
          app.use('/', require('express-pouchdb')(localPouch,{inMemoryConfig:true}));
          app.listen(process.env.POUCHDB_FAUXTON_PORT);

          const connectPeers=async function() {

            const peers=process.env.SWARM.split(",");

            var connectPeer = function() {
              if(peers.length>0) {
                  var peer=peers.pop();
                  ipfs.swarm.connect(peer).then(function() { logger.info("Connected "+peer); connectPeer();}).catch(function() { logger.info("Failed "+peer); connectPeer();});
              }
            }
            connectPeer();
          }


          setInterval(connectPeers,process.env.SWARM_RECONNECT);
          connectPeers();

          const orbitdb = new OrbitDB(ipfs)
          const kv = await orbitdb.keyvalue(process.env.NODECLASS);
          logger.info("Initialize local KV");
          kv.load();
          kv.events.on('replicated', (address) => {
              logger.debug(address);
          });
          logger.info("Peer KV "+kv.address.toString());
          subscribtions[kv.address.toString()]=function(){};
          subscribeAnnouncements(kv);
          publish(kv);
          setInterval(function() {
              publish(kv);
          },process.env.IDLE_REPUBLISH);
          var nodedb = new localPouch(wallet.address);
          var nodechanges = nodedb.changes({
            since: 'now',
            live: true,
            include_docs: true
          }).on('change', function(change) {
            publish(kv,change.doc);
          })
          if(typeof cbmain =="function") {
            cbmain(nodedb,kv);
          }
        })

  });
}
