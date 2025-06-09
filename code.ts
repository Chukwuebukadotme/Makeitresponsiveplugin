/// <reference types="@figma/plugin-typings" />

// This plugin adjusts frame widths and creates responsive breakpoints

// Add this at the top of code.ts after the initial imports
/*
const AUTHORIZED_EMAILS = [
  // Add your authorized email addresses here
  'saveek4@gmail.com',
  'mail@ajithvtom.in',
  'frankgong99@gmail.com',
  'makeitresponsive.co@gmail.com'
];

console.log('AUTHORIZED_EMAILS:', AUTHORIZED_EMAILS);

// Use this function instead of includes
function isAuthorizedEmail(email: string): boolean {
  for (let i = 0; i < AUTHORIZED_EMAILS.length; i++) {
    if (AUTHORIZED_EMAILS[i].toLowerCase() === email.toLowerCase()) {
      return true;
    }
  }
  return false;
}

// Add this function to check if user is authorized
async function checkUserAuthorization() {
  return new Promise<boolean>((resolve) => {
    figma.clientStorage.getAsync('authorized-user').then(storedAuth => {
      if (storedAuth && storedAuth.paid) {
        // User was previously authorized and has paid
        resolve(true);
        return;
      }
      // ... shows verification UI if not authorized ...
    });
  });
}

// Update verification function
async function verifyPaymentAndEmail(email: string): Promise<boolean> {
  // Here you would typically make an API call to your backend to verify the payment
  // For now, we'll just check if the email is in the authorized list
  return isAuthorizedEmail(email);
}

// Add at the top of code.ts after AUTHORIZED_EMAILS
const CHECKOUT_URL = "https://makeitresponsive.lemonsqueezy.com/buy/2957e621-c96b-4da9-8000-55cb59cca173?discount=0";

// Add these constants
const MAX_FREE_USES = 5;
const USAGE_STORAGE_KEY = 'plugin-usage-count';
*/

// Show UI - This line needs to be outside the comments
figma.showUI(__html__, { width: 400, height: 600 });

// Store selected breakpoint frames
const selectedBreakpoints: {
  [key: string]: { id: string; width: number; height: number } | null;
} = {
  desktop: null,
  tablet: null,
  mobile: null
};

// Define breakpoint width ranges
const breakpointRanges = {
  desktop: { min: 1200, max: Infinity },
  tablet: { min: 768, max: 1199 },
  mobile: { min: 0, max: 767 }
};

// Function to check if node is an image
function isImage(node: SceneNode): boolean {
  return node.type === 'RECTANGLE' && 
    'fills' in node && 
    Array.isArray(node.fills) && 
    node.fills.some(fill => fill.type === 'IMAGE');
}

// Function to validate breakpoint ranges
function validateBreakpointRanges(ranges: typeof breakpointRanges): boolean {
  const { desktop, tablet, mobile } = ranges;
  
  // Check for overlapping ranges
  if (desktop.min <= tablet.max || tablet.min <= mobile.max) {
    figma.notify('Invalid breakpoint ranges: ranges cannot overlap', { timeout: 3000 });
    return false;
  }
  
  // Check for proper ordering
  if (!(desktop.min > tablet.max && tablet.min > mobile.max)) {
    figma.notify('Invalid breakpoint ranges: ranges must be properly ordered', { timeout: 3000 });
    return false;
  }
  
  return true;
}

// Function to adjust frame width with error handling
async function adjustFrameWidth(targetWidth: number) {
  try {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.notify('Please select a frame to resize');
      return;
    }

    for (const node of selection) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        const originalWidth = node.width;
        
        // Validate target width
        if (targetWidth <= 0) {
          figma.notify('Invalid target width: must be greater than 0');
          return;
        }
        
        // Directly set the frame's width to the target width
        node.resize(targetWidth, node.height);
        
        // Adjust constraints for children
        if ('children' in node) {
          adjustChildrenConstraints(node, originalWidth, targetWidth);
        }
      } else {
        figma.notify('Please select a frame, component, or instance');
      }
    }
  } catch (error) {
    console.error('Error adjusting frame width:', error);
    figma.notify(`Error adjusting frame width: ${error.message}`, { timeout: 3000 });
  }
}

// Function to adjust children constraints
function adjustChildrenConstraints(
  node: FrameNode | ComponentNode | InstanceNode, 
  originalWidth: number, 
  newWidth: number
) {
  if (!('children' in node)) return;
  
  for (const child of node.children) {
    // Skip images - they should maintain their aspect ratio
    if (isImage(child)) continue;
    
    // Apply new Auto Layout logic ONLY to FrameNode children
    if (child.type === 'FRAME') {
      // Ensure it's a FrameNode to access Auto Layout properties
      const frameChild = child as FrameNode;
      frameChild.layoutMode = 'VERTICAL';
      frameChild.primaryAxisSizingMode = 'AUTO'; // Hug Contents Vertically
      frameChild.counterAxisSizingMode = 'FIXED'; // FILL is not valid, use FIXED instead
      
      // Resize to parent width to achieve "fill container" behavior
      frameChild.resize(newWidth, frameChild.height);
    } else if ('constraints' in child) {
      // Keep original constraint logic for non-FrameNode children
      // Handle different constraint types
      if (child.constraints.horizontal === 'STRETCH') {
        // Stretch constraint - adjust width proportionally
        const widthRatio = child.width / originalWidth;
        // Check if the child is resizable before attempting to resize
        if ('resize' in child) { 
          child.resize(newWidth * widthRatio, child.height);
        }
      } else if (child.constraints.horizontal === 'CENTER') {
        // Center constraint - adjust x position
        const centerX = newWidth / 2;
        child.x = centerX - (child.width / 2);
      } else if (child.constraints.horizontal === 'MAX') {
        // Right constraint - adjust x position
        child.x = newWidth - originalWidth + child.x;
      }
    }
    
    // If the child is a container, recursively adjust its children
    // Ensure child is actually a potential container type before recursing
    if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'INSTANCE' || child.type === 'GROUP') {
       if ('children' in child) { // Double-check 'children' exists
         adjustChildrenConstraints(
           child as FrameNode | ComponentNode | InstanceNode, // Cast needed for recursion
           originalWidth, // Pass original child width for nested calculations? No, parent's original.
           child.width // Pass the child's new width for the next level
         );
       }
    }
  }
}

// Function to select a breakpoint
function selectBreakpoint(type: string) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.notify('Please select a frame to use as a breakpoint');
    return;
  }
  
  if (selection.length > 1) {
    figma.notify('Please select only one frame');
    return;
  }
  
  const node = selection[0];
  
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    figma.notify('Please select a frame, component, or instance');
    return;
  }
  
  // Store the selected node
  selectedBreakpoints[type] = {
    id: node.id,
    width: node.width,
    height: node.height
  };
  
  // Notify UI
  figma.ui.postMessage({
    type: 'breakpoint-selected',
    breakpointType: type,
    nodeId: node.id,
    width: node.width
  });
}

// Helper function to find a node by ID
function findNodeById(id: string): SceneNode | null {
  function traverse(node: BaseNode): SceneNode | null {
    if (node.id === id) return node as SceneNode;
    if ('children' in node) {
      for (const child of (node as any).children) {
        const found = traverse(child);
        if (found) return found;
      }
    }
    return null;
  }
  
  return traverse(figma.currentPage as BaseNode);
}

// Function to monitor frame resize with cleanup
function monitorFrameResize(frame: FrameNode) {
  let lastBreakpoint = getCurrentBreakpoint(frame.width);
  let isMonitoring = true;
  
  const checkInterval = setInterval(() => {
    if (!isMonitoring || !frame || frame.removed) {
      clearInterval(checkInterval);
      return;
    }

    try {
      const currentWidth = frame.width;
      const currentBreakpoint = getCurrentBreakpoint(currentWidth);

      // Only notify if there's a change in width or breakpoint
      if (currentBreakpoint !== lastBreakpoint) {
        lastBreakpoint = currentBreakpoint;

        // Get the appropriate content for this breakpoint
        const breakpointId = frame.getPluginData(`${currentBreakpoint}BreakpointId`);
        if (breakpointId) {
          const breakpointNode = findNodeById(breakpointId);
          if (breakpointNode && 'clone' in breakpointNode) {
            // Remove existing content (except indicator)
            const indicator = frame.children.find(child => child.name === "Responsive Indicator");
            frame.children.forEach(child => {
              if (child.name !== "Responsive Indicator") {
                child.remove();
              }
            });

            // Add new content
            const content = breakpointNode.clone();
            frame.insertChild(0, content);
            content.x = 0;
            content.y = 0;

            // Ensure indicator stays on top
            if (indicator) {
              frame.appendChild(indicator);
            }
          }
        }
      }

      // Always notify UI of current width and breakpoint
      figma.ui.postMessage({
        type: 'frame-resized',
        width: currentWidth,
        breakpoint: currentBreakpoint
      });
    } catch (error) {
      console.error('Error in frame resize monitoring:', error);
      isMonitoring = false;
      clearInterval(checkInterval);
    }
  }, 100);

  // Return cleanup function
  return () => {
    isMonitoring = false;
    clearInterval(checkInterval);
  };
}

// Function to start interactive responsive mode
function startInteractiveResponsiveMode() {
  const selection = figma.currentPage.selection;
  
  if (selection.length !== 1 || selection[0].type !== 'FRAME') {
    figma.notify('Please select a single frame to make responsive');
    return;
  }

  const sourceFrame = selection[0] as FrameNode;
  
  // Create a new frame for the interactive mode
  const frame = figma.createFrame();
  frame.name = "Interactive Responsive Frame";
  frame.resize(sourceFrame.width, sourceFrame.height);
  frame.x = sourceFrame.x + sourceFrame.width + 100; // Position it to the right of the source frame
  frame.y = sourceFrame.y;
  
  // Store breakpoint information
  frame.setPluginData("isResponsiveFrame", "true");
  frame.setPluginData("breakpointRanges", JSON.stringify(breakpointRanges));
  
  // Store current breakpoint IDs if they exist
  if (selectedBreakpoints.desktop) {
    frame.setPluginData("desktopBreakpointId", selectedBreakpoints.desktop.id);
  }
  if (selectedBreakpoints.tablet) {
    frame.setPluginData("tabletBreakpointId", selectedBreakpoints.tablet.id);
  }
  if (selectedBreakpoints.mobile) {
    frame.setPluginData("mobileBreakpointId", selectedBreakpoints.mobile.id);
  }
  
  // Copy content from the selected frame
  if ('clone' in sourceFrame) {
    const content = sourceFrame.clone();
    frame.appendChild(content);
    content.x = 0;
    content.y = 0;
  }
  
  // Create indicator
  const indicator = figma.createFrame();
  indicator.name = "Responsive Indicator";
  indicator.resize(frame.width, 30);
  indicator.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.3, b: 0.6 }, opacity: 0.9 }];
  frame.appendChild(indicator);
  indicator.x = 0;
  indicator.y = 0;
  
  // Set initial content based on current width
  const initialBreakpoint = getCurrentBreakpoint(frame.width);
  const initialBreakpointId = frame.getPluginData(`${initialBreakpoint}BreakpointId`);
  if (initialBreakpointId) {
    const breakpointNode = findNodeById(initialBreakpointId);
    if (breakpointNode && 'clone' in breakpointNode) {
      // Remove existing content (except indicator)
      frame.children.forEach(child => {
        if (child.name !== "Responsive Indicator") {
          child.remove();
        }
      });
      
      const content = breakpointNode.clone();
      frame.insertChild(0, content);
      content.x = 0;
      content.y = 0;
    }
  }
  
  // Select the new frame
  figma.currentPage.selection = [frame];
  
  // Start monitoring resize
  const cleanup = monitorFrameResize(frame);
  
  // Notify UI
  figma.ui.postMessage({
    type: 'interactive-mode-started',
    frameId: frame.id,
    width: frame.width,
    currentBreakpoint: initialBreakpoint
  });
  
  figma.notify('Interactive responsive mode started with a new frame. Resize the frame to see your design adapt to different breakpoints.');

  // Add cleanup function to remove monitoring on plugin close
  (figma as any).on('close', cleanup);
}

// Helper function to determine current breakpoint based on width
function getCurrentBreakpoint(width: number): string {
  if (width >= breakpointRanges.desktop.min) {
    return 'desktop';
  } else if (width >= breakpointRanges.tablet.min && width < breakpointRanges.desktop.min) {
    return 'tablet';
  } else {
    return 'mobile';
  }
}

// Reset breakpoints
function resetBreakpoints() {
  selectedBreakpoints.desktop = null;
  selectedBreakpoints.tablet = null;
  selectedBreakpoints.mobile = null;
  
  // Notify UI
  figma.ui.postMessage({
    type: 'reset-breakpoints'
  });
  
  figma.notify('Breakpoints have been reset');
}

// Check for selection and size changes
function checkSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 1) {
    const node = selection[0];
    
    // Check if this is our responsive frame
    if (node.type === 'FRAME' && node.getPluginData("isResponsiveFrame") === "true") {
      // Get the current width and determine breakpoint
      const width = node.width;
      const breakpoint = getCurrentBreakpoint(width);
      
      // Notify UI
      figma.ui.postMessage({
        type: 'breakpoint-changed',
        breakpoint: breakpoint,
        width: width
      });
    }
  }
}

// -----------------------------------------------------------------------------
// AI-Powered Layout Generation - Phase 1: Serialization
// -----------------------------------------------------------------------------

// Add type definitions at the top of the file
type NodeData = {
  type: string;
  // Add other properties as needed
};

// Add type definitions for mixed values
type MixedValue = symbol;

interface SerializedNode {
  nodeId: string;
  nodeType: NodeData['type']; // Use a more specific type if available or a string union
  name: string;
  geometry: { x: number; y: number; width: number; height: number };
  visible: boolean;
  children: SerializedNode[];

  // Optional properties based on node type and characteristics
  content?: string; // For TEXT nodes
  isImage?: boolean; // For RECTANGLE or other nodes with an image fill

  // Auto Layout properties (if the node itself is an Auto Layout frame)
  autoLayout?: {
    direction: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    itemSpacing: number;
    primaryAxisSizingMode: 'FIXED' | 'AUTO';
    counterAxisSizingMode: 'FIXED' | 'AUTO';
    primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
    // Other properties like cornerRadius, clipsContent could be added if needed
  };

  // Layout properties (for children of an Auto Layout frame)
  layoutProperties?: {
    layoutAlign: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
    layoutGrow: number;
    // minWidth, maxWidth, minHeight, maxHeight could be relevant too
  };

  // Constraints (if not in an Auto Layout parent or if Auto Layout is not applied to this node)
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };

  // Simplified fills/strokes for now - can be expanded
  fills?: ReadonlyArray<Paint> | MixedValue;
  strokes?: ReadonlyArray<Paint> | MixedValue;
  effects?: ReadonlyArray<Effect> | MixedValue;
  // Add other relevant properties as identified by AI model requirements
}

function serializeNode(node: SceneNode): SerializedNode {
  const serialized: Partial<SerializedNode> = {
    nodeId: node.id,
    nodeType: node.type as NodeData['type'], // Cast to a string type, actual type is more complex
    name: node.name,
    visible: node.visible,
    children: [],
    // Directly available geometry for most visual scene nodes
    geometry: { x: node.x, y: node.y, width: node.width, height: node.height },
  };

  // Content for TEXT nodes
  if (node.type === 'TEXT') {
    serialized.content = node.characters;
  }

  // Check for image fills (can apply to RECTANGLE, FRAME, etc.)
  if ('fills' in node && node.fills !== (figma as any).mixed && Array.isArray(node.fills)) {
    serialized.isImage = node.fills.some(fill => fill.type === 'IMAGE' && fill.visible !== false);
  }

  // Auto Layout properties (if this node is an Auto Layout frame itself)
  if (
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
    node.layoutMode !== 'NONE'
  ) {
    serialized.autoLayout = {
      direction: node.layoutMode,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      itemSpacing: node.itemSpacing,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
    };
  }

  // Layout properties (how this node behaves if its PARENT is an Auto Layout frame)
  if ('layoutAlign' in node) { // These properties exist on nodes that can be children of an Auto Layout
    serialized.layoutProperties = {
      layoutAlign: node.layoutAlign,
      layoutGrow: node.layoutGrow,
    };
  }

  // Constraints
  if ('constraints' in node) {
    serialized.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }

  // Serialize children recursively
  if ('children' in node) {
    for (const child of node.children) {
      // Ensure child is a SceneNode before serializing
      if (isSceneNode(child)) {
         serialized.children!.push(serializeNode(child));
      }
    }
  }
  
  return serialized as SerializedNode; // Cast to the full type
}

// Helper to ensure a node is a SceneNode (very basic check, might need refinement)
function isSceneNode(node: BaseNode): node is SceneNode {
    return 'id' in node && 'type' in node && 'parent' in node;
}


/**
 * Serializes the currently selected single frame (or component/instance/group)
 * and its children into a JSON string.
 * @returns JSON string of the serialized layout, or null if selection is invalid.
 */
function serializeSelectedFrameToJSON(): string | null {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify('Please select a frame, component, instance, or group to serialize.');
    return null;
  }
  if (selection.length > 1) {
    figma.notify('Please select only a single item to serialize.');
    return null;
  }

  const selectedNode = selection[0];

  // Ensure the selected node is a type that can contain children and is generally a layout root.
  if (
    selectedNode.type !== 'FRAME' &&
    selectedNode.type !== 'COMPONENT' &&
    selectedNode.type !== 'INSTANCE' &&
    selectedNode.type !== 'GROUP' // Groups can also be considered layout roots
  ) {
    figma.notify('Please select a Frame, Component, Instance, or Group node.');
    return null;
  }
  
  // Now we know selectedNode is one of the above, which are all SceneNode and have 'children'
  // (except GroupNode's children are BaseNode[], so we added isSceneNode check in recursion)
  const castedNode = selectedNode as FrameNode | ComponentNode | InstanceNode | GroupNode;


  try {
    const serializedLayout = serializeNode(castedNode);
    return JSON.stringify(serializedLayout, null, 2);
  } catch (error: any) {
    console.error('Error during serialization:', error);
    figma.notify(`Error during serialization: ${error.message}`, { timeout: 3000 });
    return null;
  }
}

// Example usage (for testing in the console - you would call this from your UI message handler later)
// To test: Select a frame, then run figma.developerVM.runAsync('console.log(serializeSelectedFrameToJSON())') in Figma's console.
// console.log('Serialization functions loaded. Select a frame and test with:');
// console.log('figma.developerVM.runAsync(\'console.log(serializeSelectedFrameToJSON())\')');

// -----------------------------------------------------------------------------
// End of AI-Powered Layout Generation - Phase 1: Serialization
// -----------------------------------------------------------------------------

// Unified message handler
figma.ui.onmessage = async (msg: { 
  type: string; 
  width?: number;
  breakpointType?: string;
  email?: string;
}) => {
  if (msg.type === 'adjust-width' && typeof msg.width === 'number') {
    await adjustFrameWidth(msg.width);
    figma.notify(`${msg.width}px generated`, { timeout: 2000 });
  }
  
  if (msg.type === 'select-breakpoint' && msg.breakpointType) {
    selectBreakpoint(msg.breakpointType);
  }
  
  if (msg.type === 'start-interactive-mode') {
    startInteractiveResponsiveMode();
  }
  
  if (msg.type === 'reset-breakpoints') {
    resetBreakpoints();
  }
  
  if (msg.type === 'check-selection') {
    checkSelection();
  }
  
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Initialize the plugin
function initPlugin() {
  // Send available device models to UI
  figma.ui.postMessage({
    type: 'init-complete',
    breakpointRanges: breakpointRanges
  });
}

// Start the plugin directly without verification
initPlugin();


