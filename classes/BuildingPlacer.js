makeChild("BuildingPlacer","RygameObject");
BuildingPlacer.prototype.update = function() {
	if (this.visible && !this.isHelper) {
		if (GameManager.mouseReleasedRight) {
			this.stop();
			return;
		}
		
		this.checkUpdateKeyPress();
		
		this.updatePosition();	
		
		this.drawSurface = this.invalidSurface;
		for (var i =0; i < this.children.length; ++i) {
			this.children[i].drawSurface = this.children[i].invalidSurface;
			this.children[i].updatePosition();
		}
		var currentSpace = this.getCurrentSpace();
		var positionValid = this.positionValid(currentSpace);
		var childPositionsValid = true;
		for (var i = 0; i < this.children.length; ++i) {
			if (!this.children[i].positionValid(this.children[i].getCurrentSpace())) {
				childPositionsValid = false;
				continue;
			}
			this.children[i].drawSurface = this.children[i].validSurface;
		}
		if (GameManager.mouseReleasedLeft && positionValid && childPositionsValid) {
			this.placeBuilding(currentSpace);
			return;
		}
		if (positionValid) {
			this.drawSurface = this.validSurface;
		}		
	}
};

BuildingPlacer.prototype.withinLayerBounds = function() {
	//override withinLayerBounds to return true as we do not actually maintain a valid rect, and will therefore be considered out-of-bounds and not rendered otherwise
	return true;
};

BuildingPlacer.prototype.checkUpdateKeyPress = function() {
	//check if the R key is pressed
	if (GameManager.keyStates[String.fromCharCode(82)]) {
		this.holdingRKey = true;
	}
	else {
		if (this.holdingRKey) {
			this.rotate();
			this.holdingRKey = false;
		}
	}
};

BuildingPlacer.prototype.rotate = function() {
	this.dir = (this.dir+1)%4;
	//restart with new dir to create children in the correct position
	this.stop();
	this.start(this.buildingType,true);
};

BuildingPlacer.prototype.start = function(type,keepDir) {
	this.visible = true;
	console.log("starting buildingPlacer. visible: " + this.visible + ", isHelper: " + this.isHelper);
	if (type != null) {
		this.buildingType = type;
	}
	if (keepDir != true) {
		this.dir = 0;
	}
	                                  
	if (type == "tool store" || type == "teleport pad") {
		this.children.push(new BuildingPlacer("power path",true,BuildingPlacer.dirOffsets[this.dir][0],BuildingPlacer.dirOffsets[this.dir][1]));
	}
	for (var i = 0; i < this.children.length; ++i) {
		this.children[i].start();
	}
};

BuildingPlacer.prototype.stop = function() {
	this.visible = false;
	while (this.children.length > 0) {
		this.children[this.children.length - 1].die();
		this.children.pop();
	}
	console.log("stopping buildingPlacer. visible: " + this.visible + ", isHelper: " + this.isHelper);
};

BuildingPlacer.prototype.positionValid = function(space) {
	if (space.type != "ground") {
		return false;
	}
	//power paths are allowed to be colliding with other objects, as long as they are still being placed on a ground tile
	if (this.buildingType == "power path") {
		return true;
	}
	//do not allow placement on a space on which any raiders are currently colliding
	for (var i = 0; i < raiders.objectList.length; ++i) {
		if (collisionRect(raiders.objectList[i], space)) {
			return false;
		}
	}
	return true;
};

BuildingPlacer.prototype.updatePosition = function() {
	this.x = GameManager.mousePos.x;
	this.x += (gameLayer.cameraX % tileSize);
	//console.log(this.x / tileSize > 1);
	//this.x = ((this.x / tileSize > 1) ? Math.floor(this.x / tileSize) : Math.ceil(this.x / tileSize)) * tileSize;
	this.x = Math.floor(this.x / tileSize) * tileSize;
	this.x -= (gameLayer.cameraX % tileSize);
	this.y = GameManager.mousePos.y;
	this.y += (gameLayer.cameraY % tileSize);
	this.y = Math.floor(this.y / tileSize) * tileSize;
	this.y -= (gameLayer.cameraY % tileSize);
	this.x += tileSize * this.xOffset;
	this.y += tileSize * this.yOffset;
};

BuildingPlacer.prototype.placeBuilding = function(space) {
	if (this.buildingType == "power path") {
		space.setTypeProperties(this.buildingType,null,null,null,null,null,(this.dir*90 - 90 + (this.dir % 2 == 1 ? 180 : 0)) * (Math.PI / 180));
	}
	else {
		space.buildingSiteType = this.buildingType;
		space.setTypeProperties("building site",null,null,null,null,null,(this.dir*90 - 90 + (this.dir % 2 == 1 ? 180 : 0)) * (Math.PI / 180));
	}
	
	for (var i = 0; i < this.children.length; ++i) {
		this.children[i].placeBuilding(this.children[i].getCurrentSpace());
	}
	if (!this.isHelper) {
		this.stop();
	}
};

BuildingPlacer.prototype.getCurrentSpace = function() {
	//remember that the grid is actually (y,x) rather than (x,y)
	return terrain[Math.floor((this.y + gameLayer.cameraY)/tileSize)][Math.floor((this.x + gameLayer.cameraX)/tileSize)];
};

function BuildingPlacer(buildingType,isHelper,xOffset,yOffset) {
	if (xOffset == null) {
		xOffset = 0;
	}
	if (yOffset == null) {
		yOffset = 0;
	}
	RygameObject.call(this,0,0,1000000,10000,null,gameLayer,false); //update after Space, and draw in front of space
	this.buildingType = buildingType;
	
	this.drawSurface = createContext(tileSize,tileSize,false);
	this.drawSurface.globalAlpha=.25;
	this.drawSurface.fillStyle = "rgb(255,0,0)";
	this.drawSurface.fillRect(0,0,this.drawSurface.canvas.width,this.drawSurface.canvas.height); //red semi-transparent overlay
	this.invalidSurface = this.drawSurface;
	this.validSurface = createContext(tileSize,tileSize,false);
	this.validSurface.globalAlpha=.25;
	this.validSurface.fillStyle = "rgb(0,255,0)";
	this.validSurface.fillRect(0,0,this.drawSurface.canvas.width,this.drawSurface.canvas.height); //green semi-transparent overlay
	
	this.visible = false;
	this.isHelper = (isHelper == true ? true : false);
	this.xOffset = xOffset;
	this.yOffset = yOffset;
	this.children = [];
	this.holdingRKey = false;
}

//how each direction alters x,y coordinate placement
BuildingPlacer.dirOffsets = [];
BuildingPlacer.dirOffsets.push([1,0]);
BuildingPlacer.dirOffsets.push([0,-1]);
BuildingPlacer.dirOffsets.push([-1,0]);
BuildingPlacer.dirOffsets.push([0,1]);