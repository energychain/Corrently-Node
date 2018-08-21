function previewDoc(dbname,docid) {
  var db = new PouchDB('http://'+location.host+'/db/'+dbname);
  db.get(docid).then(function(doc) {
      var html="<h3>"+docid+"</h3>";

      if(typeof doc.values != "undefined") {
				html+="<canvas id='canvas'></canvas>";
      }
      $.each(doc,function(key,value) {
					if(key!="values") {
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
					}
      });
      $('#preview_'+dbname).html(html);
			if(typeof doc.values != "undefined") {
				var datasets={};
				var data = [];
				var colors=["#5BC0EB","#FDE74C","#9BC53D","#C3423F","#404E4D","#D4AA7D","#EFD09E","#D2D8B3"];
				labels = [];
				var v = doc.values;
				var last_position='right';
				$.each(doc.values,function(key,value) {
						$.each(value,function(k,v) {
							if(k=="ts") {
									//labels.push(moment(new Date(v*1)).format('D.M.Y h:m'));
									//labels.push(v*1);
									labels.push(new Date(v*1));
							}

							if(typeof datasets[k] == "undefined") {
								if(last_position=='right') last_position='left'; else last_position='right';
								var color=colors.pop();
								datasets[k]={};
								datasets[k].label=k;
								datasets[k].fill=false;
								datasets[k].data=[];
								datasets[k].yAxisID= 'y-axis-'+k;
								datasets[k].backgroundColor=color
								datasets[k].borderColor=color
								datasets[k].scaleY={
											type: 'linear',
											display: true,
											position: last_position,
											id: 'y-axis-'+k,
								}
							}
							//datasets[k].data.push({y:v,t:new Date(value.ts),x:value.ts*1});
							datasets[k].data.push(v*1);
						});
				});
				var chart_datasets=[];
				var yaxis=[];
				$.each(datasets,function(key,value) {
					if(key!="ts") {
						chart_datasets.push(value);
						yaxis.push(value.scaleY);
						}
				});
				var ctx = document.getElementById('canvas').getContext('2d');
				var myLineChart = new Chart.Line(ctx, {
						type: 'line',
						data:{ datasets: chart_datasets,
								labels:labels
						},
						options:{
									responsive: true,
									hoverMode: 'index',
									stacked: false,
									title: {
										display: true,
										text: 'Timeseries Plot '+docid
									},
									scales: {
											yAxes:yaxis,
											xAxes: [{
			                    type: 'time',
			                    display: true,
													scaleLabel: {
					                    display: true,
					                    labelString: "Date",
                					}
			                }]
									},
									pan: {
					            enabled: true,
					            mode: 'xy'
					        },

					        zoom: {
					            enabled: true,
					            mode: 'x',
					        }
						}
					});
			}
  });
}
function fetchAllDocIds(dbname) {
  var db = new PouchDB('http://'+location.host+'/db/'+dbname);
  db.allDocs({
      include_docs: false,
      attachments: false
    }).then(function (result) {
      var html="";
			html+='<div class="dropdown">';
  		html+='<button class="btn btn-secondary dropdown-toggle" type="button" id="dropdown'+dbname+'" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
    	html+="Select to preview";
  		html+="</button>";
  		html+='<div class="dropdown-menu" aria-labelledby="dropdown'+dbname+'">';
      $.each(result.rows,function(key,value) {
          html+="<a href='#' class='dropdown-item' id='preview_"+dbname+"_"+value.id+"' onclick='previewDoc(\""+dbname+"\",\""+value.id+"\")'>"+value.id+"</a>";
      });
				html+="</div></div>";
      $('#docs_'+dbname).append(html);
  });
}

function createNodeInfo(dbname) {
  var db = new PouchDB('http://'+location.host+'/db/'+dbname);
  db.get("info_node").then(function(doc) {
      var html="";
      var addClasses="";
      if(typeof doc.verifications=="undefined") {
          addClasses=" text-white bg-warning";
      }
      html+="<div id='"+dbname+"' class='card"+addClasses+"'>";
      html+='<div class="card-header">';
      html+='<a href="#" class="btn btn-default" onclick="$(\'#card-body-'+dbname+'\').collapse(\'toggle\')">'
      html+=dbname;
      html+="</a>";
      html+="</div>";
      html+='<div class="card-body collapse" id="card-body-'+dbname+'">';
      $.each(doc,function(key,value) {
						if(key!="verifications") {
            html+='<div class="row">';
            html+='<div class="col-6">';
            html+=key;
            html+='</div>';
            html+='<div class="col-6" style="align:left">';
            html+=value;
            html+='</div>';
            html+="</div>";
						}
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
      html+="<div id='preview_"+dbname+"' class=''></div>";
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
    html+="<div id='preview_"+dbname+"' class='bg-light'></div>";
    html+="</div>";
    html+="</div>";
    $('#app').append(html);
    db.close();
    fetchAllDocIds(dbname);
  });

}

$(document).ready(function() {
    $.getJSON('http://'+location.host+'/db/_all_dbs',function(data) {
        $.each(data,function(key,value) {
							if((value!="_users")&&(value!="_replicator"))
              createNodeInfo(value);
        });
    });
});
