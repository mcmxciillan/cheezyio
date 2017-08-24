var StateManager = function (options) {
  this.channelGrid = options.channelGrid;
  this.stateRefs = options.stateRefs;
};

StateManager.prototype.create = function (state) {
  var stateCellIndex = this.channelGrid.getCellIndex(state);
  var stateRef = {
    id: state.id,
    tcid: stateCellIndex, // Target cell index.
    type: state.type,
    create: state,
    killed: false
  };
  if (state.swid != null) {
    stateRef.swid = state.swid;
  }
  this.stateRefs[state.id] = stateRef;
  return stateRef;
};

// You can only update through operations which must be interpreted
// by your cell controllers (cell.js).
StateManager.prototype.update = function (stateRef, operation) {
  this.stateRefs[stateRef.id].op = operation;
  // if(this.stateRefs[stateRef.id]){
  //   if(this.stateRefs[stateRef.id].killed = true) {
  //     console.log("No idea what im doing");
  //   }
  // }
};

StateManager.prototype.getPlayer = function(stateRef){
  return
}

StateManager.prototype.removePlayer = function(stateRef) {
  console.log(stateRef);
  if(stateRef.killed){
    this.getPlayer(stateRef);
  }
};

StateManager.prototype.delete = function (stateRef) {
  this.stateRefs[stateRef.id].delete = 1;
};

module.exports.StateManager = StateManager;
