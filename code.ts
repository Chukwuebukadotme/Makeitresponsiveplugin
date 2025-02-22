/// <reference types="@figma/plugin-typings" />

import { initializeAuth, handleAuthCallback } from './src/auth';


figma.showUI(__html__, { width: 300, height: 480 });

// Function to check if node is an image
function isImage(node: SceneNode): boolean {
  return node.type === 'RECTANGLE' && (node.fills as Paint[]).some(fill => fill.type === 'IMAGE');
}

// Function to apply vertical auto layout
function applyVerticalLayout(frame: FrameNode, targetWidth: number, depth: number = 0) {
  const originalX = frame.x;
  const originalY = frame.y;
  
  // Sort children by vertical position before applying layout
  const childrenPositions = frame.children.map(child => ({
    node: child,
    y: child.y
  }));
  
  childrenPositions.sort((a, b) => a.y - b.y);
  
  // Reorder children to match visual order
  const orderedNodes = childrenPositions.map(({ node }) => node);
  for (let i = 0; i < orderedNodes.length; i++) {
    frame.insertChild(i, orderedNodes[i]);
  }
  
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.layoutAlign = 'CENTER';
  frame.paddingTop = 8;
  frame.paddingBottom = 8;
  frame.paddingLeft = 8;
  frame.paddingRight = 8;
  frame.itemSpacing = 16;

  frame.resize(targetWidth, frame.height);
  
  if (depth <= 1) {
    frame.children.forEach(child => {
      if (child.type === 'FRAME') {
        const isHorizontal = child.layoutMode === 'HORIZONTAL';
        const hasHorizontalElements = child.children.length > 1 && 
          child.children.some((grandChild, i) => 
            i > 0 && grandChild.x > child.children[i-1].x + child.children[i-1].width
          );

        if (isHorizontal || hasHorizontalElements) {
          convertToVertical(child, targetWidth, depth + 1);
        } else {
          applyVerticalLayout(child, targetWidth, depth + 1);
        }
      } else if ('layoutAlign' in child && 'constraints' in child) {
        if (isImage(child)) {
          child.layoutAlign = 'STRETCH';
          child.constraints = { horizontal: 'STRETCH', vertical: 'SCALE' };
          child.resize(targetWidth - 16, child.height);
        } else {
          child.layoutAlign = 'STRETCH';
          child.resize(targetWidth - 16, child.height);
        }
      }
    });
  }
}

// Function to convert horizontal to vertical layout
function convertToVertical(frame: FrameNode, targetWidth: number, depth: number = 0) {
  const childrenPositions = frame.children.map(child => ({
    node: child,
    x: child.x
  }));
  
  childrenPositions.sort((a, b) => a.x - b.x);
  
  const orderedNodes = childrenPositions.map(({ node }) => node);
  for (let i = 0; i < orderedNodes.length; i++) {
    frame.insertChild(i, orderedNodes[i]);
  }
  
  applyVerticalLayout(frame, targetWidth, depth);
}

// Function to convert group to frame
function convertGroupToFrame(group: GroupNode): FrameNode {
  const frame = figma.createFrame();
  
  // Copy group properties
  frame.x = group.x;
  frame.y = group.y;
  frame.resize(group.width, group.height);
  frame.name = group.name;
  
  // Set frame properties based on width
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  
  if (frame.width >= 1280) {
    frame.counterAxisSizingMode = 'FIXED';
  } else {
    frame.counterAxisSizingMode = 'AUTO';
    frame.layoutAlign = 'STRETCH';
  }
  
  frame.paddingTop = 8;
  frame.paddingBottom = 8;
  frame.paddingLeft = 8;
  frame.paddingRight = 8;
  frame.itemSpacing = 16;
  
  // Move all children from group to frame
  const parent = group.parent;
  const index = parent.children.indexOf(group);
  
  group.children.forEach(child => {
    frame.appendChild(child);
  });
  
  parent.insertChild(index, frame);
  group.remove();
  
  return frame;
}

// Function to adjust frame width
async function adjustFrameWidth(targetWidth: number) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Please select at least one frame or group');
    return;
  }

  // Animate all selected nodes first
 

  // Then apply width adjustments
  selection.forEach(node => {
    if (node.type === 'GROUP') {
      const frame = convertGroupToFrame(node);
      applyVerticalLayout(frame, targetWidth, 0);
    } else if (node.type === 'FRAME') {
      const isHorizontal = node.layoutMode === 'HORIZONTAL';
      const hasHorizontalElements = node.children.length > 1 && 
        node.children.some((child, i) => 
          i > 0 && child.x > node.children[i-1].x + node.children[i-1].width
        );

      if (isHorizontal || hasHorizontalElements) {
        convertToVertical(node, targetWidth, 0);
      } else {
        applyVerticalLayout(node, targetWidth, 0);
      }
    }
  });
  
  figma.notify(`${targetWidth}px generated`);
}

// Listen for messages from the UI
figma.ui.onmessage = async msg => {
  if (msg.type === 'check-auth') {
    const isAuthenticated = await initializeAuth();
    figma.ui.postMessage({ type: 'auth-status', isAuthenticated });
  }
  
  if (msg.type === 'auth-callback') {
    await handleAuthCallback(msg.code);
    figma.ui.postMessage({ type: 'auth-success' });
  }
  
  if (msg.type === 'adjust-width') {
    await adjustFrameWidth(msg.width);
    figma.notify(`${msg.width}px generated`, { timeout: 2000 });
  }
  
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};


