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
      PouchDB.plugin(require('pouchdb-upsert'));
      const localPouch = PouchDB.defaults({prefix: process.env.DATADIR});
      localPouch.plugin(require('pouchdb-upsert'));
      const express = require('express');
      const wallet = new ethers.Wallet(process.env.PRIVATEKEY);
      var ipfs_peers = [];
      var ipfs_peers_transient=[];

      const ipfsOptions = {
         EXPERIMENTAL: {
           pubsub: true
         }
      }
      logger.info("Authority of Node "+process.env.ACCOUNT);

      const ipfs = new IPFS(ipfsOptions)
      const ANNOUNCEMENT_CHANNEL=process.env.ANNOUNCEMENT_CHANNEL;
      ipfs.on('error', (e) => logger.error("IPFS"+e))
      ipfs.on('ready', async () => {
          const connectPeers = function() {
            if(ipfs_peers_transient.length>0) {
                var peer= ipfs_peers_transient.pop();
                ipfs.swarm.connect(peer).then(function() {
                  logger.info("Connected "+peer); connectPeers();
                }).catch(function() {
                  logger.info("Failed "+peer); connectPeers();
                });
            }
          }

         ipfs.id(function(err,id) {
           process.env.IPFS_ID="/ip4/"+process.env.EXTERNAL_IP+"/tcp/4002/ipfs/"+id.id;
           logger.info("IPFS ID of Node "+process.env.IPFS_ID);
         });

         const orbitdb = new OrbitDB(ipfs)
         const localdb = await orbitdb.docs("local");
         const app = express();
         PouchDB.defaults({prefix: ''});
         app.use('/dapp', express.static('dapp'));
         if((typeof process.env.DUMPS != "undefined")&&(process.env.DUMPS!=null)) {
           logger.info("Serving dumps");
           app.use('/dumps', express.static(process.env.DUMPS));
         }
         app.use('/', require('express-pouchdb')(localPouch,{inMemoryConfig:true}));

         app.listen(process.env.POUCHDB_FAUXTON_PORT);

         // Ensure we have IPFS Peers we could talk too
         ipfs_peers=process.env.SWARM.split(",");
         ipfs_peers_transient=ipfs_peers;
         connectPeers();
         setInterval(function() {
           ipfs_peers_transient=ipfs_peers;
           connectPeers();
         },process.env.SWARM_RECONNECT);

         // Ensure we listen to annouuncements and are able to publish to
          const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);
          const verifications = await orbitdb.log('verifications');
          var orbitpeers=[];
          announcement.events.on('replicated', () => {

            var preProcessed = announcement.iterator({ limit: -1 }).collect().map(e => e.payload.value)

            const processResults=function() {
                if(result.length>0) {
                    var item=result.pop();
                    var e20abi=[  {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}];
                    var contract = new ethers.Contract(process.env.E20CONTRACT, e20abi,ethers.providers.getDefaultProvider("homestead"));
                    contract.balanceOf(item.account).then(async function(balance) {
                          var sign_address = ethers.Wallet.verifyMessage(item.peer, item.signature);
                          if((balance>0)&&(sign_address==item.account)&&(sign_address!=wallet.address)) {
                                ipfs.swarm.connect(item.swarm).then(function() {
                                  logger.info("Announcement Connected "+item.swarm);
                                }).catch(function() {
                                  logger.info("Announcement Failed "+item.swarm);
                                });
                                ipfs_peers.push(item.swarm);

                                 const remotedb = new localPouch(item.account);
                                 const remoteorbit = await orbitdb.docs(item.peer).catch(function() {logger.info("Ignore legacy");});
                                 if(typeof remoteorbit!="undefined") {
                                           logger.info("Monitoring " + item.account+ " "+item.doc);
                                           remoteorbit.events.on('replicated', async () => {
                                              const docs = await remoteorbit.get(item.doc);
                                              const doc = docs[0];
                                              if(typeof doc != "undefined") {
                                              remotedb.upsert(doc._id,function(orgdoc) {
                                                      return doc;
                                                  }).then(function() {
                                                    logger.info("Upsert "+doc._id+" for "+item.account);
                                                    if((typeof process.env.DUMPS != "undefined")&&(process.env.DUMPS!=null)) {
                                                      fs.mkdir(process.env.DUMPS,function(e){
                                                            fs.mkdir(process.env.DUMPS+item.account,function(e) {
                                                              fs.writeFile(process.env.DUMPS+item.account+"/"+doc._id+".json",JSON.stringify(doc),function(e) {});
                                                            });
                                                      });
                                                    }
                                                    var signature=wallet.signMessage(item.account+"_"+doc._id);
                                                    verifications.add({account:item.account,doc:doc._id,verifier:wallet.address,signature:signature});
                                                  }).catch(function(e) {
                                                    logger.info("Upsert issue:"+e);
                                                  });
                                              }
                                            })
                                    }

                                    // Verification hook
                                    if(typeof item.verification != "undefined") {
                                        const verifyorbit = await orbitdb.log(item.verification);
                                        verifyorbit.events.on('replicated', () => {
                                          var preProcessed = verifyorbit.iterator({ limit: -1 }).collect().map(e => e.payload.value);
                                          var processResults = function() {
                                              if(preProcessed.length>0) {
                                                  var item = preProcessed.pop();
                                                  var sign_address = ethers.Wallet.verifyMessage(item.account+"_"+item.doc, item.signature);
                                                  if(sign_adress==item.verifier) {
                                                    const remotedb = new localPouch(item.account);
                                                    remotedb.upsert(item.doc,function(orgdoc) {
                                                            if(typeof orgdoc.verifications == "undefined") orgdoc.verifications = {};
                                                            if(typeof orgdoc.verifications[item.verifier]=="undefined") orgdoc.verifications[item.verifier]=item;
                                                            return orgdoc;
                                                        }).then(function() {
                                                            logger.info("Verified "+item.doc+" "+item.account+" by "+item.verifier);
                                                            processResults();
                                                        });
                                                  } else {
                                                    processResults();
                                                  }
                                              }
                                          }
                                          processResults();
                                        });
                                    }
                          }
                          processResults();
                    });
                }
            }
            var result=[];

            for(var i=0;i<preProcessed.length;i++) {
                  if(typeof orbitpeers[preProcessed[i].peer+preProcessed[i].doc]=="undefined") {
                    orbitpeers[preProcessed[i].peer+preProcessed[i].doc]=preProcessed[i];
                    result.push(preProcessed[i]);
                  }
            }

            if(result.length>0) {
              processResults();
            }

          })


          // Ensure we have a local bound database
          var nodedb = new localPouch("local");
          var nodechanges = nodedb.changes({
            since: 'now',
            live: true,
            include_docs: true
          }).on('change', function(change) {
            logger.info("Local Document change: "+change.doc._id);
            localdb.put(change.doc);
            var signature=wallet.signMessage(localdb.address.toString());
            announcement.add({peer:localdb.address.toString(),signature:signature,account:wallet.address,doc:change.doc._id,swarm:process.env.IPFS_ID,verifications:verifications.address.toString()});
          })
          if(typeof cbmain =="function") {
           cbmain(nodedb,localdb);
          }
      });
  });
}
