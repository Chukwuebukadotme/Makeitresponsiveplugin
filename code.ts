/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 300, height: 120 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'resize-frame' && typeof msg.width === 'number') {
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && selection[0].type === 'FRAME') {
      selection[0].resize(msg.width, selection[0].height);
      figma.notify(`Frame resized to ${msg.width}px`);
    } else {
      figma.notify('Please select a single frame.');
    }
  }
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};


