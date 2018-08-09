const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

const ipfs = new IPFS(ipfsOptions)


ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)

  const kv = await orbitdb.keyvalue(process.argv[2]);
  await kv.load();


  // Listen for updates from peers
  kv.events.on('replicated', (address) => {
    console.log(address);
    const value =  kv.get('updated');
    console.log(value);
  })


})
