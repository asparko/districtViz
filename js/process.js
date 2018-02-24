var w = "100%";
var h = "100%";

var svg = d3.select("#graph");
var play = d3.select("#play");
var paused = false;

w = parseInt(svg.style("width"), 10);
h = parseInt(svg.style("height"), 10);



//var colors = [d3.rgb("e24e42"), d3.rgb("#e9b000"), d3.rgb("#eb6eb0"), d3.rgb("#008f95")];
var colors = [d3.rgb("#6bbaa7"), d3.rgb("#fba100"), d3.rgb("#6c648b"), d3.rgb("#e24e42")];
var padding = 30;
var xScale = d3.scale.linear()
	.domain([d3.min(coords, function(d) { return d[0]; }), d3.max(coords, function(d) { return d[0]; })])
	.range([padding, w - padding]);
var yScale = d3.scale.linear()
	.domain([d3.min(coords, function(d) { return d[1]; }), d3.max(coords, function(d) { return d[1]; })])
	.range([h - padding, padding]);//change for others


/*var l = svg.append("line")
	.attr("x1", xScale(coords[6][0]))
	.attr("y1", yScale(coords[6][1]))
	.attr("x2", xScale(coords[14][0]))
	.attr("y2", yScale(coords[14][1]))
	.attr("stroke", "white")
	.attr("stroke-width", 3)
	.attr("stroke-dasharray", 1);

var l2 = svg.append("line")
.	attr("x1", xScale(coords[52][0]))
.attr("y1", yScale(coords[52][1]))
.attr("x2", xScale(coords[10][0]))
.attr("y2", yScale(coords[10][1]))
.attr("stroke", "white")
.attr("stroke-width", 3)
.attr("stroke-dasharray", 1);
*/


//MAKE THE EDGES
var lines = svg.selectAll("line")
	.data(edges)
	.enter()
	.append("line");

lines.attr("x1", function(d){return xScale(coords[d[0]-1][0]);})//-1 because edges are 1 indexed
	.attr("y1", function(d){return yScale(coords[d[0]-1][1]);})
	.attr("x2", function(d){return xScale(coords[d[1]-1][0]);})
	.attr("y2", function(d){return yScale(coords[d[1]-1][1]);})
	.attr("stroke", "lightgray")
	.attr("stroke-width", 2);

//MAKE THE NODES
var circles = svg.selectAll("circle")
	.data(coords)
	.enter()
	.append("circle");


circles.attr("cx", function(d) {return xScale(d[0]);})
	.attr("cy", function(d){return yScale(d[1]);})
	.attr("r", 8)
	.attr("fill", function(d, i){ 
		return colors[dist[i]-1]; 
	});

//A helper function i found on the interwebs to check if all previous transitions are complete.
function endall(transition, callback) { 
	if (transition.size() === 0) { callback() }
	var n = 0; 
	transition 
    	.each(function() { ++n; }) 
    	.each("end", function() { if (!--n) callback.apply(this, arguments); }); 
}


function findConflicted(){
	var conflictedIndices = [];
	lines.each(function(d, i){
		if (dist[d[0]-1]!=dist[d[1]-1]){//-1 because districting is 1-indexed
			//console.log(i);
			conflictedIndices.push(i);
			d3.select(this)
				.attr("class", "conflicted");
		} else {
			d3.select(this)
				.attr("class", "notConflicted");
		}
	});
	return conflictedIndices;
}

function pickConflicted(conflictedIndices){
	var len = conflictedIndices.length;
	var rand = Math.floor(Math.random()*len);
	return conflictedIndices[rand];
}

// Breadth First Search using adjacency list
function bfs(v, adjlist, visited) {
  var q = [];
  var current_group = [];
  var i, len, adjV, nextVertex;
  q.push(v);
  visited[v] = true;
  while (q.length > 0) {
    v = q.shift();
    current_group.push(v);
    // Go through adjacency list of vertex v, and push any unvisited
    // vertex onto the queue.
    adjV = adjlist[v];
    for (i = 0, len = adjV.length; i < len; i += 1) {
      nextVertex = adjV[i];
      if (!visited[nextVertex]) {
        q.push(nextVertex);
        visited[nextVertex] = true;
      }
    }
  }
  return current_group;
};

//function 

function colorEdgesBeforeSwitch(selectedConflict){
	lines.attr("stroke", "lightgray");
	d3.selectAll(".conflicted")
		.transition()
			.duration(1500)
			.attr("stroke", "black")
			.attr("stroke-width", 3)
		.transition()
			.duration(1500)
			.delay(2000)
			.attr("stroke", "white");
	d3.select(lines[0][selectedConflict])
		.transition()
			.duration(1500)
			.delay(2000)
			.attr("stroke", "black");	
}

function colorEdgesAfterSwitch(){
	d3.selectAll(".conflicted")
		.transition()
			.delay(4500)
			.duration(1500)
			.attr("stroke", "white");
	d3.selectAll(".notConflicted")
		.transition()
			.delay(4500)
			.duration(1500)
			.attr("stroke", "lightgray")
			.attr("stroke-width", 2);
}

function colorCircles(){
	circles
		.transition()
			.delay(3500)
			.duration(1000)
			.attr("fill", function(d,i){
				return colors[dist[i]-1];
			});	
}

$("#play").click(function(){
	totalDuration = 0;

	var conflictedIndices = [];
	conflictedIndices = findConflicted();
	var selectedConflict = pickConflicted(conflictedIndices);

	colorEdgesBeforeSwitch(selectedConflict);

	//Choose one of the nodes to switch to other district
	var rand = Math.floor(Math.random()*2);
	var nodePair = d3.select(lines[0][selectedConflict]).datum();

	var nodeIndices = [nodePair[0]-1, nodePair[1]-1];
	var switchingNodeIdx = nodeIndices[rand];
	var stayingNodeIdx = nodeIndices[(rand+1)%2];

	//Check to ensure switching the selected node won't create disconnected districts
	var groups = [];
	var visited = {};
	var v;

	for (v in adjList) {
	  if (adjList.hasOwnProperty(v) && !visited[v]) {
	    groups.push(bfs(v, adjList, visited));
	  }
	}

	console.log(groups);

	dist[switchingNodeIdx] = dist[stayingNodeIdx];
	//Now, recolor circles to reflect new districting
	colorCircles();
	/*
	circles
		.transition()
			.duration(1500)
			.attr("fill", function(d,i){
				return colors[dist[i]-1];
			});
	endall();		
	*/
	//And, recolor edges to reflect new district divisions
	
	var conflictedIndices = [];
	conflictedIndices = findConflicted();
	colorEdgesAfterSwitch();
});
	/*
	d3.selectAll(".conflicted")
		.transition()
			.duration(500)
			.attr("stroke", "white");
	d3.selectAll(".notConflicted")
		.transition()
			.duration(500)
			.attr("stroke", "lightgray");
	*/


$("#pause").click(function(){
	paused = true;
});

////remove this later:
//svg.selectAll("text")
//.data(coords)
//.enter()
//.append("text")
//.text(function(d, i) {
//      return i;
//      })
//.attr("x", function(d) {
//      return xScale(d[0])-3;
//      })
//.attr("y", function(d) {
//      return yScale(d[1])+3;
//      })
//.attr("font-size", "9px");



var myVar;
var step = 0;
var clicker = 0;
var steps = 9;


function myTimer(){
    dist[stepRecord[step][0]-1] = stepRecord[step][1];
    step += 1;
    if (step>stepRecord.length){
        window.clearInterval(myVar);
        step=0;
        return;
    }
    circles.attr("fill", function(d, i){ return colors[dist[i]-1]; })//-1 because districting is 1 indexed);
    
    lines.attr("stroke", function(d){
               if (dist[d[0]-1]!=dist[d[1]-1]){ return "white";//-1 because edges are 1 indexed
               }else{ return colors[dist[d[0]-1]-1];}})
        .attr("stroke-width", function(d){
          if (dist[d[0]-1]!=dist[d[1]-1]){ return 0;//-1 because edges are 1 indexed
          }else{ return 2;
          }})
;
}


function update(){
    

    
}


;
