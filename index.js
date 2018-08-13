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
/***
 Nächster Schritt:
 - Swarm dynamisch erweitern um Netzstabilität zu fördern
 - Blacklist einführen
 - Performance Werte tatsächlich schreiben (nicht nur irgend ein JSON Objekt)
 - Lokaler Server aufsetzen für dAPPing
*/

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

const ipfs = new IPFS(ipfsOptions)
const ANNOUNCEMENT_CHANNEL=process.env.ANNOUNCEMENT_CHANNEL;
var subscribtions={};

const publish=async function(kv,change) {
  var nodedb = new localPouch(process.env.ACCOUNT);
  if(typeof change=="undefined"){
      nodedb.get(process.env.NODECLASS).then(async function(obj) {
        obj._publishTimeStamp=new Date();
        await kv.set(obj._id,obj);
    }).catch(function(err) {
      console.log("Try publish without document?",err);
    });
  } else {
    const orbitdb = new OrbitDB(ipfs);
    const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);
    var signature=wallet.signMessage(kv.address.toString());
    announcement.add({peer:kv.address.toString(),signature:signature,account:wallet.address,doc:change._id});
    console.log("Pubslished:",change);
    change._publishTimeStamp=new Date();
    await kv.set(change._id,change);
  }
}

const subscribePeer=async function(item) {
  var peer = item.peer;
  var e20abi=[  {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}];
  var contract = new ethers.Contract(process.env.E20CONTRACT, e20abi,ethers.providers.getDefaultProvider("homestead"));
  contract.balanceOf(item.account).then(async function(balance) {
      if(balance>0) {
        console.log("Added Peer",item.account,item.doc);
        const orbitdb = new OrbitDB(ipfs);
        const kv = await orbitdb.keyvalue(peer);
        await kv.load();
        kv.events.on('replicated', (address) => {
            const v = kv.get(item.doc);
            if(typeof v._publishTimeStamp!="undefined") {
                v.publishTimeStamp=v._publishTimeStamp;
                delete v._publishTimeStamp;
            }
            console.log("Updated",peer,item.account,item.doc);
            // Validate Signature!
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
              return db.put(v).catch(function(e) {console.log("Insert",e,item.account,item.doc)});
            });
        });
      } else {
        console.log("Ignored peer ",item.account,item.peer);
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
          for(var i=0;i<items.length;i++) {
            if(typeof subscribtions[items[i].peer+"/"+items[i].doc] == "undefined") {
              subscribtions[items[i].peer+"/"+items[i].doc]=items[i].account;
              subscribePeer(items[i]);
            }
          }
      }

      var announceThis=function() {
        var signature=wallet.signMessage(kv.address.toString());
        announcement.add({peer:kv.address.toString(),signature:signature,account:wallet.address,doc:process.env.NODECLASS});
      };

      setInterval(announceThis,process.env.IDLE_ANNOUNCEMENT);
      announceThis();

      console.log("Announcement Channel",announcement.address.toString());

      announcement.events.on('replicated', (address) => {
        console.log("Announcement Event",address);
        refreshItems();
      })
      refreshItems();
}

// Main Process starts here...

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {

  const app = express();
  PouchDB.defaults({prefix: ''});
  app.use('/', require('express-pouchdb')(localPouch,{inMemoryConfig:true}));
  app.listen(4009);

  const connectPeers=async function() {
    const peers=process.env.SWARM.split(",");
    for(var i=0;i<peers.length;i++) {
      ipfs.swarm.connect(peers[i]).then(function() { console.log(peers[i]);}).catch(function() {});
    }
  }

  setInterval(connectPeers,process.env.SWARM_RECONNECT);
  connectPeers();

  const orbitdb = new OrbitDB(ipfs)
  const kv = await orbitdb.keyvalue(process.env.NODECLASS);
  await kv.load();
  kv.events.on('replicated', (address) => {

  });
  console.log("Peer KV",kv.address.toString());
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
})
