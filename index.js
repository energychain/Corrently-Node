const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

const ipfs = new IPFS(ipfsOptions)
const ANNOUNCEMENT_CHANNEL="/orbitdb/QmTuydQHGjzgmcrupdG1yXjAxk372b3GT445iBfSR3jLC5/annoucement";

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  ipfs.swarm.connect("/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j");
  const orbitdb = new OrbitDB(ipfs)
  const kv = await orbitdb.keyvalue('correnlty-performance');
  await kv.load();
  // Listen for updates from peers
  kv.events.on('replicated', (address) => {

  })
  const access = {
      // Give write access to everyone
      write: ['*'],
  }

  const announcement = await orbitdb.log(ANNOUNCEMENT_CHANNEL);
  announcement.add({peer:kv.address.toString(),signature:"signed"});
  console.log("Announcement Channel",announcement.address.toString());

  announcement.events.on('replicated', (address) => {
    const all = announcement.iterator({ limit: 1 })
      .collect()
      .map((e) => e.payload.value);
    console.log(all);
      console.log("New Replicate",address);
  })

})
