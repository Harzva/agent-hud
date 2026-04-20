"use strict";

const { activateAgentHud, deactivateAgentHud } = require("./src/host/panel-view");

function activate(context) {
  return activateAgentHud(context);
}

function deactivate() {
  return deactivateAgentHud();
}

module.exports = {
  activate,
  deactivate
};
