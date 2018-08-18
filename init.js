module.exports=function(cb) {
  const fs = require("fs");
  const fname=".env";
  const {createClient} = require('nat-upnp-2');
  console.log("Initialize Corrently Node");
  const client = createClient();

  // Try to open Port via UPnp for IPFS communication
  client.portMapping({
  public: 4002,
  private: 4002,
  ttl: 10
    }, (err) => {
  // Will be called once finished
  });
  client.externalIp((err, ip) => {

      fs.stat(fname,function(err,stat) {
          if(typeof stat == "undefined") {
              console.log(".env does not exist - creating new!");
              const ethers = require("ethers");
              const wallet = new ethers.Wallet.createRandom();
              // try to create  a new ENV file
              var content="";
              if(typeof process.env.ACCOUNT=="undefined") content+='ACCOUNT="'+wallet.address+'"\n';
              if(typeof process.env.PRIVATEKEY=="undefined") content+='PRIVATEKEY="'+wallet.privateKey+'"\n';              
              content+='# No Change required below (under normal operation)';
              content+='\n';
              content+="SWARM=/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j,/ip4/18.184.17.153/tcp/4002/ipfs/QmRy3WXC9yyNGNpztP8yAjfWYqJJs5Yg6SzGKfjhr63kg8,/ip4/108.61.210.201/tcp/4002/ipfs/QmPGfRp7VL7XiR28QXVWTzPNZxGRngVfgrT3DCuGMuLucD";
              content+='\n';
              content+="SWARM_RECONNECT=3600000";
              content+='\n';
              content+="IDLE_REPUBLISH=3600000";
              content+='\n';
              content+="IDLE_ANNOUNCEMENT=3600000";
              content+='\n';
              content+="ANNOUNCEMENT_CHANNEL=/orbitdb/QmTuydQHGjzgmcrupdG1yXjAxk372b3GT445iBfSR3jLC5/annoucement";
              content+='\n';
              content+="DATADIR=./data/";
              content+='\n';
              content+="NODEOBJ=./data/local.json";
              content+='\n';
              content+="NODECLASS=data";
              content+='\n';
              content+="E20CONTRACT='0x725b190bc077ffde17cf549aa8ba25e298550b18'";
              content+='\n';
              content+='POUCHDB_FAUXTON_PORT=4009';
              content+='\n';
              fs.writeFile(fname,content,function() {
                fs.mkdir("./data/",function(e){
                      if(typeof cb=="function") cb();
                  });
              });
          } else {
            require('dotenv').config();
            if((typeof process.env.PUBLIC_IP!="undefined")&&(process.env.PUBLIC_IP!=null)) {
              process.env.EXTERNAL_IP=process.env.PUBLIC_IP;
            } else {
              process.env.EXTERNAL_IP=ip;
            }
            console.log("Public IP (set in .env)",process.env.EXTERNAL_IP);
              if(typeof cb=="function") cb();
          }
      });
  });
}
