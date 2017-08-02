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
};

StateManager.prototype.delete = function (stateRef) {
  this.stateRefs[stateRef.id].delete = 1;
};

StateManager.prototype.reCreate = function (stateRef) {
  var newRef = stateRef;
  //this.delete(stateRef);
  this.create(newRef);

};

module.exports.StateManager = StateManager;
