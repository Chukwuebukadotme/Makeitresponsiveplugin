import { SerializedNode } from '../types/LayoutTypes'

export interface DesignElement {
  id: string
  type: 'text' | 'image' | 'button' | 'container' | 'navigation' | 'card' | 'form' | 'icon'
  priority: number // 1-10, higher = more important
  flexibility: 'fixed' | 'flexible' | 'scalable'
  semanticRole: string
  constraints: {
    minWidth?: number
    maxWidth?: number
    aspectRatio?: number
    preserveProportions: boolean
  }
  relationships: {
    parent?: string
    children: string[]
    siblings: string[]
    dependencies: string[]
  }
  responsiveBehavior: {
    hideOnMobile?: boolean
    stackOnTablet?: boolean
    reorderOnMobile?: number
    scaleStrategy: 'proportional' | 'fixed' | 'content-based'
  }
}

export interface LayoutStructure {
  hierarchy: DesignElement[]
  contentFlow: 'vertical' | 'horizontal' | 'grid' | 'mixed'
  breakpoints: {
    desktop: number
    tablet: number
    mobile: number
  }
  designPatterns: string[]
  complexity: number
}

export class DesignAnalyzer {
  private designPatterns = {
    navigation: ['nav', 'menu', 'header', 'topbar'],
    hero: ['hero', 'banner', 'jumbotron', 'featured'],
    content: ['content', 'main', 'article', 'section'],
    sidebar: ['sidebar', 'aside', 'secondary'],
    footer: ['footer', 'bottom', 'contact'],
    card: ['card', 'item', 'product', 'post'],
    form: ['form', 'input', 'field', 'submit'],
    button: ['button', 'btn', 'cta', 'action']
  }

  analyzeDesign(serializedNode: SerializedNode): LayoutStructure {
    const elements = this.extractDesignElements(serializedNode)
    const hierarchy = this.buildHierarchy(elements)
    const contentFlow = this.determineContentFlow(serializedNode)
    const designPatterns = this.identifyDesignPatterns(elements)
    const complexity = this.calculateComplexity(elements)

    return {
      hierarchy,
      contentFlow,
      breakpoints: this.suggestBreakpoints(serializedNode),
      designPatterns,
      complexity
    }
  }

  private extractDesignElements(node: SerializedNode, parent?: DesignElement): DesignElement[] {
    const elements: DesignElement[] = []
    
    const element: DesignElement = {
      id: node.nodeId,
      type: this.classifyElement(node),
      priority: this.calculatePriority(node),
      flexibility: this.determineFlexibility(node),
      semanticRole: this.inferSemanticRole(node),
      constraints: this.analyzeConstraints(node),
      relationships: {
        parent: parent?.id,
        children: [],
        siblings: [],
        dependencies: []
      },
      responsiveBehavior: this.determineResponsiveBehavior(node)
    }

    elements.push(element)

    // Process children recursively
    if (node.children) {
      for (const child of node.children) {
        const childElements = this.extractDesignElements(child, element)
        elements.push(...childElements)
        element.relationships.children.push(child.nodeId)
      }
    }

    return elements
  }

  private classifyElement(node: SerializedNode): DesignElement['type'] {
    const name = node.name.toLowerCase()
    
    // Text classification
    if (node.nodeType === 'TEXT' || name.includes('text') || name.includes('label')) {
      return 'text'
    }
    
    // Image classification
    if (node.isImage || name.includes('image') || name.includes('photo') || name.includes('picture')) {
      return 'image'
    }
    
    // Button classification
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
      return 'button'
    }
    
    // Navigation classification
    if (this.matchesPattern(name, this.designPatterns.navigation)) {
      return 'navigation'
    }
    
    // Form classification
    if (this.matchesPattern(name, this.designPatterns.form)) {
      return 'form'
    }
    
    // Card classification
    if (this.matchesPattern(name, this.designPatterns.card)) {
      return 'card'
    }
    
    // Icon classification
    if (name.includes('icon') || (node.geometry.width < 50 && node.geometry.height < 50)) {
      return 'icon'
    }
    
    // Default to container
    return 'container'
  }

  private calculatePriority(node: SerializedNode): number {
    let priority = 5 // Base priority
    
    // Size-based priority
    const area = node.geometry.width * node.geometry.height
    if (area > 100000) priority += 2 // Large elements
    if (area < 1000) priority -= 1 // Small elements
    
    // Position-based priority (top elements are more important)
    if (node.geometry.y < 100) priority += 2
    if (node.geometry.y > 800) priority -= 1
    
    // Name-based priority
    const name = node.name.toLowerCase()
    if (name.includes('hero') || name.includes('main') || name.includes('primary')) priority += 3
    if (name.includes('secondary') || name.includes('aside')) priority -= 1
    if (name.includes('footer')) priority -= 2
    
    return Math.max(1, Math.min(10, priority))
  }

  private determineFlexibility(node: SerializedNode): DesignElement['flexibility'] {
    // Auto layout elements are flexible
    if (node.autoLayout) {
      return 'flexible'
    }
    
    // Images and icons should scale
    if (node.isImage || node.nodeType === 'TEXT') {
      return 'scalable'
    }
    
    // Small elements are often fixed
    if (node.geometry.width < 100 && node.geometry.height < 100) {
      return 'fixed'
    }
    
    return 'flexible'
  }

  private inferSemanticRole(node: SerializedNode): string {
    const name = node.name.toLowerCase()
    
    if (this.matchesPattern(name, this.designPatterns.navigation)) return 'navigation'
    if (this.matchesPattern(name, this.designPatterns.hero)) return 'hero'
    if (this.matchesPattern(name, this.designPatterns.content)) return 'main-content'
    if (this.matchesPattern(name, this.designPatterns.sidebar)) return 'complementary'
    if (this.matchesPattern(name, this.designPatterns.footer)) return 'contentinfo'
    if (this.matchesPattern(name, this.designPatterns.button)) return 'button'
    if (this.matchesPattern(name, this.designPatterns.form)) return 'form'
    
    return 'generic'
  }

  private analyzeConstraints(node: SerializedNode): DesignElement['constraints'] {
    const constraints: DesignElement['constraints'] = {
      preserveProportions: false
    }
    
    // Images should preserve aspect ratio
    if (node.isImage) {
      constraints.aspectRatio = node.geometry.width / node.geometry.height
      constraints.preserveProportions = true
    }
    
    // Text elements have minimum readable sizes
    if (node.nodeType === 'TEXT') {
      constraints.minWidth = 200 // Minimum readable width
    }
    
    // Buttons have standard size constraints
    if (node.name.toLowerCase().includes('button')) {
      constraints.minWidth = 120
      constraints.maxWidth = 300
    }
    
    return constraints
  }

  private determineResponsiveBehavior(node: SerializedNode): DesignElement['responsiveBehavior'] {
    const name = node.name.toLowerCase()
    const behavior: DesignElement['responsiveBehavior'] = {
      scaleStrategy: 'proportional'
    }
    
    // Navigation elements often collapse on mobile
    if (this.matchesPattern(name, this.designPatterns.navigation)) {
      behavior.hideOnMobile = node.geometry.width > 600
    }
    
    // Sidebar content stacks on tablet
    if (this.matchesPattern(name, this.designPatterns.sidebar)) {
      behavior.stackOnTablet = true
      behavior.reorderOnMobile = 2 // Move to bottom
    }
    
    // Small decorative elements can be hidden
    if (node.geometry.width < 50 && node.geometry.height < 50) {
      behavior.hideOnMobile = true
    }
    
    // Images use content-based scaling
    if (node.isImage) {
      behavior.scaleStrategy = 'content-based'
    }
    
    // Text uses fixed scaling to maintain readability
    if (node.nodeType === 'TEXT') {
      behavior.scaleStrategy = 'fixed'
    }
    
    return behavior
  }

  private buildHierarchy(elements: DesignElement[]): DesignElement[] {
    // Sort by priority and position
    return elements.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }
      // Secondary sort by vertical position
      return a.relationships.parent ? 1 : -1
    })
  }

  private determineContentFlow(node: SerializedNode): LayoutStructure['contentFlow'] {
    if (node.autoLayout) {
      return node.autoLayout.direction === 'HORIZONTAL' ? 'horizontal' : 'vertical'
    }
    
    // Analyze children positioning to infer flow
    if (node.children && node.children.length > 1) {
      const positions = node.children.map(child => ({
        x: child.geometry.x,
        y: child.geometry.y
      }))
      
      const horizontalVariation = Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x))
      const verticalVariation = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y))
      
      if (horizontalVariation > verticalVariation * 2) return 'horizontal'
      if (verticalVariation > horizontalVariation * 2) return 'vertical'
      return 'grid'
    }
    
    return 'vertical'
  }

  private identifyDesignPatterns(elements: DesignElement[]): string[] {
    const patterns: string[] = []
    
    const hasNavigation = elements.some(e => e.type === 'navigation')
    const hasHero = elements.some(e => e.semanticRole === 'hero')
    const hasCards = elements.filter(e => e.type === 'card').length > 2
    const hasSidebar = elements.some(e => e.semanticRole === 'complementary')
    
    if (hasNavigation) patterns.push('navigation')
    if (hasHero) patterns.push('hero-section')
    if (hasCards) patterns.push('card-grid')
    if (hasSidebar) patterns.push('sidebar-layout')
    
    return patterns
  }

  private calculateComplexity(elements: DesignElement[]): number {
    let complexity = 0
    
    // Base complexity from element count
    complexity += elements.length * 0.1
    
    // Nesting complexity
    const maxDepth = this.calculateMaxDepth(elements)
    complexity += maxDepth * 0.5
    
    // Layout complexity
    const autoLayoutElements = elements.filter(e => e.flexibility === 'flexible').length
    complexity += autoLayoutElements * 0.2
    
    return Math.min(10, complexity)
  }

  private calculateMaxDepth(elements: DesignElement[]): number {
    let maxDepth = 0
    
    function getDepth(elementId: string, currentDepth: number = 0): number {
      const element = elements.find(e => e.id === elementId)
      if (!element || element.relationships.children.length === 0) {
        return currentDepth
      }
      
      let maxChildDepth = currentDepth
      for (const childId of element.relationships.children) {
        const childDepth = getDepth(childId, currentDepth + 1)
        maxChildDepth = Math.max(maxChildDepth, childDepth)
      }
      
      return maxChildDepth
    }
    
    const rootElements = elements.filter(e => !e.relationships.parent)
    for (const root of rootElements) {
      maxDepth = Math.max(maxDepth, getDepth(root.id))
    }
    
    return maxDepth
  }

  private suggestBreakpoints(node: SerializedNode): { desktop: number; tablet: number; mobile: number } {
    const width = node.geometry.width
    
    // Suggest breakpoints based on content width
    return {
      desktop: Math.max(1200, width),
      tablet: Math.max(768, Math.min(width * 0.75, 1024)),
      mobile: Math.max(320, Math.min(width * 0.4, 480))
    }
  }

  private matchesPattern(name: string, patterns: string[]): boolean {
    return patterns.some(pattern => name.includes(pattern))
  }
}