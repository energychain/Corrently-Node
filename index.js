Error.stackTraceLimit = Infinity;
require('dotenv').config();
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const fs = require("fs");

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

const ipfs = new IPFS(ipfsOptions)
const ANNOUNCEMENT_CHANNEL="/orbitdb/QmTuydQHGjzgmcrupdG1yXjAxk372b3GT445iBfSR3jLC5/annoucement";
var subscribtions={};

const publish=async function(kv) {
  var obj = JSON.parse(fs.readFileSync("./node.performance.json"));
  obj.timeStamp=new Date();
  await kv.set("performance",obj);
}

const subscribePeer=async function(peer) {
  const orbitdb = new OrbitDB(ipfs);
  const kv = await orbitdb.keyvalue(peer);
  await kv.load();
  kv.events.on('replicated', (address) => {
      const v = kv.get("performance");
      console.log("Updated",peer,v);
  });
  const v = kv.get("Performance");
  console.log("Initial Entry",peer,v);
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
              subscribtions[items[i].peer]=subscribePeer(items[i].peer);
            }
          }
      }

      var announceThis=function() {
        announcement.add({peer:kv.address.toString(),signature:"signed"});
      };

      setInterval(announceThis,60000);
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
  ipfs.swarm.connect("/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j").catch(function() {})
  const orbitdb = new OrbitDB(ipfs)
  const kv = await orbitdb.keyvalue('correnlty');
  await kv.load();
  kv.events.on('replicated', (address) => {

  });
  console.log("Peer KV",kv.address.toString());
  subscribtions[kv.address.toString()]=function(){};
  subscribeAnnouncements(kv);
  publish(kv);
  setInterval(function() {
      publish(kv);
  },360000);
  fs.watch('./node.performance.json', { encoding: 'buffer' }, (eventType, filename) => {
    publish(kv);
  });

})
