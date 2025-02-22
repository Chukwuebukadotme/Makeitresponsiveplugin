interface LayoutAnalysis {
  optimalSpacing: number;
  recommendedPadding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentHierarchy: {
    priority: number;
    recommendedWidth: number;
  }[];
}

function analyzeContentDensity(frame: FrameNode): number {
  const area = frame.width * frame.height;
  const childrenArea = frame.children.reduce((sum, child) => 
    sum + (child.width * child.height), 0);
  return childrenArea / area;
}

function calculateOptimalSpacing(frame: FrameNode): number {
  const spacings = frame.children.slice(1).map((child, i) => {
    const prev = frame.children[i];
    return child.y - (prev.y + prev.height);
  }).filter(space => space > 0);

  if (spacings.length === 0) return 16;
  
  // Use median spacing as it's more resistant to outliers
  spacings.sort((a, b) => a - b);
  const mid = Math.floor(spacings.length / 2);
  return spacings[mid];
}

function analyzePadding(frame: FrameNode, targetWidth: number): LayoutAnalysis['recommendedPadding'] {
  const density = analyzeContentDensity(frame);
  const baseValue = targetWidth < 768 ? 12 : 16;
  
  // Adjust padding based on content density
  const paddingScale = density > 0.7 ? 0.8 : density > 0.5 ? 1 : 1.2;
  
  return {
    top: Math.round(baseValue * paddingScale),
    bottom: Math.round(baseValue * paddingScale),
    left: Math.round(baseValue * paddingScale),
    right: Math.round(baseValue * paddingScale)
  };
}

export function analyzeLayout(frame: FrameNode, targetWidth: number): LayoutAnalysis {
  return {
    optimalSpacing: calculateOptimalSpacing(frame),
    recommendedPadding: analyzePadding(frame, targetWidth),
    contentHierarchy: frame.children.map((child, index) => ({
      priority: child.type === 'FRAME' ? 1 : 0.5,
      recommendedWidth: targetWidth - (2 * analyzePadding(frame, targetWidth).left)
    }))
  };
} 