# Corrently-Node
Node for Corrently Assets

Mainly this is a Proof of Stake implementation for (JSON) document sharing via IPFS.

Goal of this module is to decentralize technical due diligence for Corrently business https://corrently.com/ a micro invest case for renewable energy generation based on blockchain technology.

## Documentation
Please refer to the Medium article: [https://medium.com/@zoernert/decentralized-due-diligence-serverless-dapp-5d042198960c]

If you like to play arround try:

```cli
npm install -g corrently-node

$ corrently-node
```

### Run as Daemon
```
corrently-node start
corrently-node stop
corrently-node restart
```

### Publish a file and sign it
```
corrently-node -j FILENAME.json -t DOCNAME
```

You could add `-m` to monitor for changes of file. File/Document will be automtically republished on change.
