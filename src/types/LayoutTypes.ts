// Enhanced type definitions for the responsive design system

export interface SerializedNode {
  nodeId: string
  nodeType: string
  name: string
  visible: boolean
  children: SerializedNode[]
  geometry: { x: number; y: number; width: number; height: number }
  
  // Content properties
  content?: string
  isImage?: boolean
  
  // Auto Layout properties
  autoLayout?: {
    direction: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
    paddingLeft: number
    paddingRight: number
    paddingTop: number
    paddingBottom: number
    itemSpacing: number
    primaryAxisSizingMode: 'FIXED' | 'AUTO'
    counterAxisSizingMode: 'FIXED' | 'AUTO'
    primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
  }
  
  // Layout properties for children of Auto Layout
  layoutProperties?: {
    layoutAlign: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'
    layoutGrow: number
  }
  
  // Constraints for non-Auto Layout positioning
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
  }
  
  // Visual properties
  fills?: ReadonlyArray<Paint> | symbol
  strokes?: ReadonlyArray<Paint> | symbol
  effects?: ReadonlyArray<Effect> | symbol
}

export interface ResponsiveBreakpoint {
  name: string
  width: number
  height?: number
  scaleFactor: number
  optimizations: ResponsiveOptimization[]
}

export interface ResponsiveOptimization {
  type: 'layout' | 'typography' | 'spacing' | 'visibility' | 'interaction'
  description: string
  impact: 'low' | 'medium' | 'high'
  automatic: boolean
}

export interface DesignToken {
  name: string
  value: string | number
  category: 'color' | 'typography' | 'spacing' | 'border' | 'shadow'
  responsive?: {
    mobile?: string | number
    tablet?: string | number
    desktop?: string | number
  }
}

export interface ComponentVariant {
  name: string
  properties: Record<string, any>
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  node: SerializedNode
}

export interface LayoutGrid {
  columns: number
  gutter: number
  margin: number
  maxWidth?: number
  breakpoint: string
}

export interface ResponsiveRule {
  selector: string
  property: string
  value: string | number
  breakpoint: string
  condition?: string
}

export interface AccessibilityCheck {
  type: 'contrast' | 'touch-target' | 'text-size' | 'focus-indicator'
  status: 'pass' | 'warning' | 'fail'
  message: string
  element?: string
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  threshold: number
  status: 'good' | 'needs-improvement' | 'poor'
}

export interface ResponsiveDesignReport {
  timestamp: string
  originalDesign: SerializedNode
  variants: ComponentVariant[]
  optimizations: ResponsiveOptimization[]
  accessibility: AccessibilityCheck[]
  performance: PerformanceMetric[]
  recommendations: string[]
}