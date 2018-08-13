module.exports=function(cb) {
  const fs = require("fs");
  const fname=".env";

  fs.stat(fname,function(err,stat) {
      if(typeof stat == "undefined") {
          console.log(".env does not exist - creating new!");
          const ethers = require("ethers");
          const wallet = new ethers.Wallet.createRandom();
          // try to create  a new ENV file
          var content="";
          content+='ACCOUNT="'+wallet.address+'"';
          content+='\n';
          content+='PRIVATEKEY="'+wallet.privateKey+'"';
          content+='\n';
          content+='# No Change required below (under normal operation)';
          content+='\n';
          content+="SWARM=/ip4/52.59.191.11/tcp/4002/ipfs/QmcDy1vs1U39AG6Ls5XqTqwamdsyWkrTcgVYzJtAyou78j,/ip4/52.59.191.11/tcp/4002/ipfs/QmRy3WXC9yyNGNpztP8yAjfWYqJJs5Yg6SzGKfjhr63kg8";
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
              if(typeof cb=="function") cb();
          });
      } else {
          if(typeof cb=="function") cb();
      }
  });
}
