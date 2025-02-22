declare const figma: {
  showUI: (html: string, options?: { width?: number; height?: number }) => void;
  ui: {
    postMessage: (pluginMessage: any) => void;
    onmessage: ((msg: { 
      type: string; 
      width?: number;
      code?: string;
    }) => void) | null;
  };
  createFrame: () => FrameNode;
  currentPage: {
    selection: readonly SceneNode[];
  };
  notify: (message: string, options?: { timeout?: number }) => void;
  closePlugin: () => void;
  clientStorage: {
    getAsync: (key: string) => Promise<any>;
    setAsync: (key: string, value: any) => Promise<void>;
  };
};

interface FrameNode extends SceneNode {
  type: "FRAME";
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisSizingMode: "FIXED" | "AUTO";
  counterAxisSizingMode: "FIXED" | "AUTO";
  layoutAlign: "STRETCH" | "CENTER";
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  itemSpacing: number;
  resize: (width: number, height: number) => void;
  children: SceneNode[];
  appendChild: (child: SceneNode) => void;
  insertChild: (index: number, child: SceneNode) => void;
}

interface GroupNode extends SceneNode {
  type: "GROUP";
  children: SceneNode[];
  parent: BaseNode & ChildrenMixin;
}

interface SceneNode {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: BaseNode & ChildrenMixin;
  remove: () => void;
}

interface Paint {
  type: string;
}

interface BaseNode {
  id: string;
  name: string;
}

interface ChildrenMixin {
  children: SceneNode[];
}

declare const __html__: string; 