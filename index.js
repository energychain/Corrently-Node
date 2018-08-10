Error.stackTraceLimit = Infinity;
require('dotenv').config();
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const fs = require("fs");
const ethers = require("ethers");

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

const publish=async function(kv) {
  var obj = JSON.parse(fs.readFileSync(process.env.NODEOBJ));
  obj.timeStamp=new Date();
  await kv.set(process.env.NODECLASS,obj);
}

const subscribePeer=async function(item) {
  var peer = item.peer;
  console.log("Subsribe Request",item);
  var e20abi=[  {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}];
  var contract = new ethers.Contract(process.env.E20CONTRACT, e20abi,ethers.providers.getDefaultProvider("homestead"));
  contract.balanceOf(item.account).then(async function(balance) {
      if(balance>0) {
        const orbitdb = new OrbitDB(ipfs);
        const kv = await orbitdb.keyvalue(peer);
        await kv.load();
        kv.events.on('replicated', (address) => {
            const v = kv.get(process.env.NODECLASS);
            console.log("Updated",peer,item.account,v);
            fs.writeFileSync(process.env.DATADIR+item.account+".json",JSON.stringify(v));
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
            if(typeof subscribtions[items[i].peer] == "undefined") {
              subscribtions[items[i].peer]=items[i].account;
              subscribePeer(items[i]);
            }
          }
      }

      var announceThis=function() {
        console.log("announceThis");
        announcement.add({peer:kv.address.toString(),signature:"signed",account:process.env.ACCOUNT});
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

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {

  const connectPeers=function() {
    const peers=process.env.SWARM.split(",");
    ipfs.swarm.connect("/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j").catch(function() {})
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
  fs.watch(process.env.NODEOBJ, { encoding: 'buffer' }, (eventType, filename) => {
    publish(kv);
  });

})
