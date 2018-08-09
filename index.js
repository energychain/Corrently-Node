Error.stackTraceLimit = Infinity;
require('dotenv').config();
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

const ipfs = new IPFS(ipfsOptions)
const ANNOUNCEMENT_CHANNEL="/orbitdb/QmTuydQHGjzgmcrupdG1yXjAxk372b3GT445iBfSR3jLC5/annoucement";

var publish=async function(kv) {
  var value=new Date();
  kv.set("Performance",{updated:value});
}

const subscribePeer=async function(peer) {
  const kv = await orbitdb.keyvalue('correnlty-performance');
  await kv.load();
  kv.events.on('replicated', (address) => {
      console.log("Peer Event",peer,address);
  });
}

const subscribeAnnouncements=async function(kv) {
      const orbitdb = new OrbitDB(ipfs);
      const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);
      var subscribtions={};

      var announceThis=function() {
        announcement.add({peer:kv.address.toString(),signature:"signed"});
      };

      setInterval(announceThis,60000);
      announceThis();

      console.log("Announcement Channel",announcement.address.toString());

      announcement.events.on('replicated', (address) => {
        const items = announcement.iterator({ limit: 100 })
          .collect()
          .map((e) => e.payload.value);
          for(var i=0;i<items.length;i++) {
            if(typeof subscribtions[items[i].peer] == "undefined") {
              subscribtions[items[i].peer]=subscribePeer(items[i].peer);
            }
          }
      })
}

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  ipfs.swarm.connect("/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j").catch(function() {})
  const orbitdb = new OrbitDB(ipfs)
  const kv = await orbitdb.keyvalue('correnlty');
  await kv.load();
  // Listen for updates from peers
  kv.events.on('replicated', (address) => {

  });
  console.log("Peer KV",kv.address.toString());
  subscribeAnnouncements(kv);
  publish(kv);
  setInterval(function() {
      publish(kv);
  },2000);

})
