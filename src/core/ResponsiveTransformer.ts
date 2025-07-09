import { DesignElement, LayoutStructure } from './DesignAnalyzer'
import { SerializedNode } from '../types/LayoutTypes'

export interface ResponsiveVariant {
  breakpoint: 'desktop' | 'tablet' | 'mobile'
  width: number
  transformedNode: SerializedNode
  optimizations: string[]
}

export interface TransformationRule {
  condition: (element: DesignElement, breakpoint: string) => boolean
  transform: (element: DesignElement, node: SerializedNode, targetWidth: number) => SerializedNode
  priority: number
}

export class ResponsiveTransformer {
  private transformationRules: TransformationRule[] = []

  constructor() {
    this.initializeTransformationRules()
  }

  transformDesign(
    originalNode: SerializedNode,
    layoutStructure: LayoutStructure,
    targetBreakpoints: { desktop: number; tablet: number; mobile: number }
  ): ResponsiveVariant[] {
    const variants: ResponsiveVariant[] = []

    // Create variants for each breakpoint
    for (const [breakpoint, width] of Object.entries(targetBreakpoints)) {
      const transformedNode = this.transformForBreakpoint(
        originalNode,
        layoutStructure,
        breakpoint as 'desktop' | 'tablet' | 'mobile',
        width
      )

      variants.push({
        breakpoint: breakpoint as 'desktop' | 'tablet' | 'mobile',
        width,
        transformedNode,
        optimizations: this.getAppliedOptimizations(breakpoint as any, layoutStructure)
      })
    }

    return variants
  }

  private transformForBreakpoint(
    node: SerializedNode,
    layoutStructure: LayoutStructure,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    targetWidth: number
  ): SerializedNode {
    // Create a deep copy of the node
    const transformedNode = this.deepCloneNode(node)
    
    // Apply global transformations
    this.applyGlobalTransformations(transformedNode, breakpoint, targetWidth)
    
    // Apply element-specific transformations
    this.applyElementTransformations(transformedNode, layoutStructure, breakpoint, targetWidth)
    
    // Apply layout optimizations
    this.applyLayoutOptimizations(transformedNode, layoutStructure, breakpoint, targetWidth)
    
    return transformedNode
  }

  private applyGlobalTransformations(
    node: SerializedNode,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    targetWidth: number
  ): void {
    // Resize the main container
    const scaleFactor = targetWidth / node.geometry.width
    node.geometry.width = targetWidth
    
    // Adjust padding based on screen size
    if (node.autoLayout) {
      const paddingScale = this.getPaddingScale(breakpoint)
      node.autoLayout.paddingLeft *= paddingScale
      node.autoLayout.paddingRight *= paddingScale
      node.autoLayout.paddingTop *= paddingScale
      node.autoLayout.paddingBottom *= paddingScale
      
      // Adjust spacing
      node.autoLayout.itemSpacing *= paddingScale
    }
  }

  private applyElementTransformations(
    node: SerializedNode,
    layoutStructure: LayoutStructure,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    targetWidth: number
  ): void {
    const element = layoutStructure.hierarchy.find(e => e.id === node.nodeId)
    if (!element) return

    // Apply transformation rules
    for (const rule of this.transformationRules) {
      if (rule.condition(element, breakpoint)) {
        const transformed = rule.transform(element, node, targetWidth)
        Object.assign(node, transformed)
      }
    }

    // Recursively transform children
    if (node.children) {
      for (const child of node.children) {
        this.applyElementTransformations(child, layoutStructure, breakpoint, targetWidth)
      }
    }
  }

  private applyLayoutOptimizations(
    node: SerializedNode,
    layoutStructure: LayoutStructure,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    targetWidth: number
  ): void {
    // Convert horizontal layouts to vertical on mobile
    if (breakpoint === 'mobile' && node.autoLayout?.direction === 'HORIZONTAL') {
      const shouldStack = this.shouldStackOnMobile(node, layoutStructure)
      if (shouldStack) {
        node.autoLayout.direction = 'VERTICAL'
        this.adjustVerticalSpacing(node)
      }
    }

    // Optimize grid layouts
    if (layoutStructure.contentFlow === 'grid') {
      this.optimizeGridLayout(node, breakpoint, targetWidth)
    }

    // Apply content reordering
    this.applyContentReordering(node, layoutStructure, breakpoint)
  }

  private initializeTransformationRules(): void {
    // Text scaling rule
    this.transformationRules.push({
      condition: (element) => element.type === 'text',
      transform: (element, node, targetWidth) => {
        const scaleFactor = this.getTextScaleFactor(element, targetWidth)
        if (node.content) {
          // Simulate text size adjustment (in real implementation, this would affect font size)
          node.geometry.height *= scaleFactor
        }
        return node
      },
      priority: 1
    })

    // Image optimization rule
    this.transformationRules.push({
      condition: (element) => element.type === 'image',
      transform: (element, node, targetWidth) => {
        if (element.constraints.preserveProportions && element.constraints.aspectRatio) {
          const maxWidth = targetWidth * 0.9 // Max 90% of container width
          if (node.geometry.width > maxWidth) {
            node.geometry.width = maxWidth
            node.geometry.height = maxWidth / element.constraints.aspectRatio
          }
        }
        return node
      },
      priority: 2
    })

    // Button optimization rule
    this.transformationRules.push({
      condition: (element) => element.type === 'button',
      transform: (element, node, targetWidth) => {
        // Ensure buttons are touch-friendly on mobile
        if (targetWidth < 768) {
          node.geometry.height = Math.max(44, node.geometry.height) // Minimum touch target
          node.geometry.width = Math.max(120, Math.min(node.geometry.width, targetWidth * 0.8))
        }
        return node
      },
      priority: 3
    })

    // Navigation collapse rule
    this.transformationRules.push({
      condition: (element, breakpoint) => element.type === 'navigation' && breakpoint === 'mobile',
      transform: (element, node, targetWidth) => {
        // Simulate navigation collapse (in real implementation, this would create a hamburger menu)
        if (element.responsiveBehavior.hideOnMobile) {
          node.visible = false
        }
        return node
      },
      priority: 4
    })

    // Container width rule
    this.transformationRules.push({
      condition: (element) => element.type === 'container',
      transform: (element, node, targetWidth) => {
        if (element.flexibility === 'flexible') {
          const padding = this.getContainerPadding(targetWidth)
          node.geometry.width = targetWidth - (padding * 2)
        }
        return node
      },
      priority: 5
    })
  }

  private shouldStackOnMobile(node: SerializedNode, layoutStructure: LayoutStructure): boolean {
    if (!node.children || node.children.length < 2) return false
    
    // Check if children are wide enough to warrant stacking
    const totalChildWidth = node.children.reduce((sum, child) => sum + child.geometry.width, 0)
    const availableWidth = node.geometry.width * 0.9 // Account for padding
    
    return totalChildWidth > availableWidth
  }

  private optimizeGridLayout(
    node: SerializedNode,
    breakpoint: 'desktop' | 'tablet' | 'mobile',
    targetWidth: number
  ): void {
    if (!node.children) return

    const columns = this.getOptimalColumnCount(breakpoint, node.children.length)
    const itemWidth = (targetWidth - (columns - 1) * 16) / columns // 16px gap

    // Arrange children in grid
    let currentRow = 0
    let currentCol = 0

    for (const child of node.children) {
      child.geometry.width = itemWidth
      child.geometry.x = currentCol * (itemWidth + 16)
      child.geometry.y = currentRow * (child.geometry.height + 16)

      currentCol++
      if (currentCol >= columns) {
        currentCol = 0
        currentRow++
      }
    }

    // Update container height
    const rows = Math.ceil(node.children.length / columns)
    const itemHeight = node.children[0]?.geometry.height || 200
    node.geometry.height = rows * itemHeight + (rows - 1) * 16
  }

  private applyContentReordering(
    node: SerializedNode,
    layoutStructure: LayoutStructure,
    breakpoint: 'desktop' | 'tablet' | 'mobile'
  ): void {
    if (!node.children || breakpoint === 'desktop') return

    // Sort children based on mobile reorder priority
    const elementsWithOrder = node.children.map(child => {
      const element = layoutStructure.hierarchy.find(e => e.id === child.nodeId)
      return {
        child,
        order: element?.responsiveBehavior.reorderOnMobile || 0
      }
    })

    elementsWithOrder.sort((a, b) => a.order - b.order)
    
    // Reposition elements vertically
    let currentY = 0
    for (const { child } of elementsWithOrder) {
      child.geometry.y = currentY
      currentY += child.geometry.height + 16 // 16px spacing
    }

    // Update the children array order
    node.children = elementsWithOrder.map(item => item.child)
  }

  private getOptimalColumnCount(breakpoint: 'desktop' | 'tablet' | 'mobile', itemCount: number): number {
    const maxColumns = {
      desktop: 4,
      tablet: 2,
      mobile: 1
    }

    return Math.min(maxColumns[breakpoint], itemCount)
  }

  private getPaddingScale(breakpoint: 'desktop' | 'tablet' | 'mobile'): number {
    const scales = {
      desktop: 1.0,
      tablet: 0.8,
      mobile: 0.6
    }
    return scales[breakpoint]
  }

  private getTextScaleFactor(element: DesignElement, targetWidth: number): number {
    if (targetWidth < 768) {
      return element.priority > 7 ? 1.1 : 0.9 // Emphasize important text, reduce others
    }
    return 1.0
  }

  private getContainerPadding(targetWidth: number): number {
    if (targetWidth < 768) return 16
    if (targetWidth < 1024) return 24
    return 32
  }

  private adjustVerticalSpacing(node: SerializedNode): void {
    if (node.autoLayout) {
      node.autoLayout.itemSpacing = Math.max(8, node.autoLayout.itemSpacing * 0.7)
    }
  }

  private getAppliedOptimizations(breakpoint: string, layoutStructure: LayoutStructure): string[] {
    const optimizations: string[] = []

    if (breakpoint === 'mobile') {
      optimizations.push('Mobile-first layout')
      optimizations.push('Touch-friendly sizing')
      optimizations.push('Vertical stacking')
    }

    if (breakpoint === 'tablet') {
      optimizations.push('Tablet-optimized grid')
      optimizations.push('Balanced spacing')
    }

    if (layoutStructure.designPatterns.includes('navigation')) {
      optimizations.push('Responsive navigation')
    }

    if (layoutStructure.designPatterns.includes('card-grid')) {
      optimizations.push('Adaptive card layout')
    }

    return optimizations
  }

  private deepCloneNode(node: SerializedNode): SerializedNode {
    return JSON.parse(JSON.stringify(node))
  }
}