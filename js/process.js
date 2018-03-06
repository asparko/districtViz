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

function removeConflictedEdges(conflictedIndices){
	//Makes a different adjacency list which excludes conflicted edges
	//So we have four disconnected subgraphs.

	//Deep copy full adjList
	var districtEdges = edges.slice(0);

	for (var i = conflictedIndices.length - 1; i >= 0; i--) {
		districtEdges.splice(conflictedIndices[i],1);		
	};

	//Make new adjList
	var districtAdjList = makeAdjacenyList(districtEdges);
	return districtAdjList;
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

function checkConnedtedSize(distAdjList){
	var groups = [];
	var groupSizes = [];
	var visited = {};
	var v;

	for (v in distAdjList) {
	  if (distAdjList.hasOwnProperty(v) && !visited[v]) {
	    groups.push(bfs(v, distAdjList, visited));
	  }
	}

	for (var i = groups.length - 1; i >= 0; i--) {
		groupSizes[i]=groups[i].length;
	};
	return groupSizes;

}

function colorEdgesBeforeSwitch(selectedConflict){
	lines.transition().duration(500).attr("stroke", "lightgray");
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
	var transitions = 0;
	d3.selectAll(".conflicted")
		.transition()
			.delay(4500)
			.duration(1500)
			.attr("stroke", "white");
	d3.selectAll(".notConflicted")
		.transition()
			.each(function() { transitions++; }) 
			.delay(4500)
			.duration(1500)
			.attr("stroke", "lightgray")
			.attr("stroke-width", 2)
			.each("end", function() {
				if( --transitions === 0 ) {
					callbackWhenAllIsDone();
				};
	        });
			//.on("end", function() { next(keyIndex+1) }); 
			//.on("end", function(){ hello(); });

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

function playOneRound(){
	console.log("Playing round one.")
	totalDuration = 0;

	var conflictedIndices = [];
	conflictedIndices = findConflicted();
	var selectedConflict = pickConflicted(conflictedIndices);

	colorEdgesBeforeSwitch(selectedConflict);

	var testPotentialSwitch = true;

	while(testPotentialSwitch){
		testPotentialSwitch = false;
		//Choose one of the nodes to switch to other district
		var rand = Math.floor(Math.random()*2);
		var nodePair = d3.select(lines[0][selectedConflict]).datum();

		var nodeIndices = [nodePair[0]-1, nodePair[1]-1];
		var switchingNodeIdx = nodeIndices[rand];
		var stayingNodeIdx = nodeIndices[(rand+1)%2];

		//Check to ensure switching the selected node won't create disconnected districts
		var prevDistrict = dist[switchingNodeIdx];
		var distAdjList = removeConflictedEdges(conflictedIndices);
		//Get group sizes before switch
		var prevGroups = checkConnedtedSize(distAdjList);
		console.log("prev group sizes: ", prevGroups);
		//Get group sizes after switch
		dist[switchingNodeIdx] = dist[stayingNodeIdx];
		var putativeConflicts = findConflicted();
		var putativeDistAdjList = removeConflictedEdges(putativeConflicts);
		var putativeGroups = checkConnedtedSize(putativeDistAdjList);
		console.log("putative group sizes: ", putativeGroups);

		//If any group size changes by more than 1, undo dist change and keep trying! 
		for (var i = prevGroups.length - 1; i >= 0; i--) {
			if (Math.abs(prevGroups[i] - putativeGroups[i]) > 1){
				console.log('continuing');
				dist[switchingNodeIdx] = prevDistrict;
				testPotentialSwitch = true;
				continue;
			} 
		}
	};

	
	//Now, recolor circles to reflect new districting
	colorCircles();

	//And, recolor edges to reflect new district divisions	
	var conflictedIndices = [];
	conflictedIndices = findConflicted();
	colorEdgesAfterSwitch();
};


$("#play").click(function(){
	playOneRound();
});

$("#pause").click(function(){
	lines.transition();
});

function callbackWhenAllIsDone(){
	console.log("calling back on done.");
	$( "#play" ).trigger( "click" );
}
