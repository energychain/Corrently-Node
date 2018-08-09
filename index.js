const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

// OrbitDB uses Pubsub which is an experimental feature
// and need to be turned on manually.
// Note that these options need to be passed to IPFS in
// all examples even if not specfied so.
const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

// Create IPFS instance
const ipfs = new IPFS(ipfsOptions)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {

  const orbitdb = new OrbitDB(ipfs)
  console.log("Pubkey",orbitdb.key.getPublic('hex'));

  const access = {
    // Setup write access
    write: [
      // Give access to ourselves
      orbitdb.key.getPublic('hex'),
      // Give access to the second peer
      '042c07044e7ea51a489c02854db5e09f0191690dc59db0afd95328c9db614a2976e088cab7c86d7e48183191258fc59dc699653508ce25bf0369d67f33d5d77839',
    ],
  }

  const db = await orbitdb.keyvalue('first-database', access)
  console.log(db.address.toString());
})
