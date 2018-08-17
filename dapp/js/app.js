function previewDoc(dbname,docid) {
  var db = new PouchDB('http://'+location.host+'/'+dbname);
  db.get(docid).then(function(doc) {
      var html="<h3>"+docid+"</h3>";
      if(typeof doc.values != "undefined") {
        var datasets=[];
        var data = [];
        labels = [];
        var v = doc.values;
        $.each(doc.values,function(key,value) {


        });        
      }
      $.each(doc,function(key,value) {
            html+='<div class="row">';
            html+='<div class="col-6">';
            html+=key;
            html+='</div>';
            html+='<div class="col-6" style="align:left">';
            if(key=="verifications") {
              $.each(value,function(k,v) {
                  html+=" "+k;
              });
            } else {
              html+=value;
            }
            html+='</div>';
            html+="</div>";
      });
      $('#preview_'+dbname).html(html);

  });
}
function fetchAllDocIds(dbname) {
  var db = new PouchDB('http://'+location.host+'/'+dbname);
  db.allDocs({
      include_docs: false,
      attachments: false
    }).then(function (result) {
      var html="";
      $.each(result.rows,function(key,value) {
          html+="<li><a href='#' class='btn' id='preview_"+dbname+"_"+value.id+"' onclick='previewDoc(\""+dbname+"\",\""+value.id+"\")'>"+value.id+"</a></li>";
      });
      $('#docs_'+dbname).append(html);
  });
}

function createNodeInfo(dbname) {
  var db = new PouchDB('http://'+location.host+'/'+dbname);
  db.get("info_node").then(function(doc) {
      var html="";
      html+="<div id='"+dbname+"' class='card'>";
      html+='<div class="card-header">';
      html+='<a href="#" onclick="$(\'#card-body-'+dbname+'\').collapse(\'toggle\')">'
      html+=dbname;
      html+="</a>";
      html+="</div>";
      html+='<div class="card-body collapse" id="card-body-'+dbname+'">';
      $.each(doc,function(key,value) {
            html+='<div class="row">';
            html+='<div class="col-6">';
            html+=key;
            html+='</div>';
            html+='<div class="col-6" style="align:left">';
            html+=value;
            html+='</div>';
            html+="</div>";
      });
      html+='<div class="row">';
      html+='<div class="col-6">';
      html+="Docs";
      html+='</div>';
      html+='<div class="col-6" style="align:left">';
      html+="<ul id='docs_"+dbname+"'></ul>";
      html+='</div>';
      html+='</div>';
      html+="<hr/>";
      html+="<div id='preview_"+dbname+"' class='bg-light'></div>";
      html+="</div>";
      html+="</div>";
      $('#app').append(html);
      db.close();
      fetchAllDocIds(dbname);
  }).catch(function(e) {
    var html="";
    html+="<div id='"+dbname+"' class='card'>";
    html+='<div class="card-header">';
    html+='<a href="#" onclick="$(\'#card-body-'+dbname+'\').collapse(\'toggle\')">'
    html+=dbname;
    html+="</a>";
    html+="</div>";
    html+='<div class="card-body collapse" id="card-body-'+dbname+'">';
    html+='<div class="row">';
    html+='<div class="col-6">';
    html+="Docs";
    html+='</div>';
    html+='<div class="col-6" style="align:left">';
    html+="<ul id='docs_"+dbname+"'></ul>";
    html+='</div>';
    html+='</div>';
    html+="<hr/>";
    html+="<div id='preview_"+dbname+"' class='bg-secondary'></div>";
    html+="</div>";
    html+="</div>";
    $('#app').append(html);
    db.close();
    fetchAllDocIds(dbname);
  });

}

$(document).ready(function() {
    $.getJSON('http://'+location.host+'/_all_dbs',function(data) {
      console.log(data);
        $.each(data,function(key,value) {
              createNodeInfo(value);
        });
    });
});
