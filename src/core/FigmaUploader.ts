import { ResponsiveVariant } from './ResponsiveTransformer'
import { SerializedNode } from '../types/LayoutTypes'

export interface UploadResult {
  success: boolean
  frameIds: string[]
  errors: string[]
  warnings: string[]
}

export interface UploadOptions {
  spacing: number
  naming: {
    prefix: string
    includeBreakpoint: boolean
    includeDimensions: boolean
  }
  organization: 'horizontal' | 'vertical' | 'grid'
  createPage: boolean
  pageName?: string
}

export class FigmaUploader {
  private readonly DEFAULT_SPACING = 100
  private readonly DEFAULT_OPTIONS: UploadOptions = {
    spacing: this.DEFAULT_SPACING,
    naming: {
      prefix: 'Responsive',
      includeBreakpoint: true,
      includeDimensions: true
    },
    organization: 'horizontal',
    createPage: false
  }

  async uploadResponsiveVariants(
    variants: ResponsiveVariant[],
    originalFrame: FrameNode,
    options: Partial<UploadOptions> = {}
  ): Promise<UploadResult> {
    const uploadOptions = { ...this.DEFAULT_OPTIONS, ...options }
    const result: UploadResult = {
      success: false,
      frameIds: [],
      errors: [],
      warnings: []
    }

    try {
      // Create page if requested
      let targetPage = figma.currentPage
      if (uploadOptions.createPage && uploadOptions.pageName) {
        targetPage = this.createResponsivePage(uploadOptions.pageName)
      }

      // Calculate positions for frames
      const positions = this.calculateFramePositions(variants, originalFrame, uploadOptions)

      // Create frames for each variant
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i]
        const position = positions[i]

        try {
          const newFrame = await this.createFrameFromVariant(
            variant,
            originalFrame,
            position,
            uploadOptions
          )

          if (newFrame) {
            result.frameIds.push(newFrame.id)
            targetPage.appendChild(newFrame)
          }
        } catch (error) {
          result.errors.push(`Failed to create ${variant.breakpoint} variant: ${error.message}`)
        }
      }

      // Add responsive indicators
      this.addResponsiveIndicators(result.frameIds, variants, uploadOptions)

      // Create responsive documentation
      if (result.frameIds.length > 0) {
        this.createResponsiveDocumentation(variants, targetPage, uploadOptions)
      }

      result.success = result.frameIds.length > 0
      
      if (result.success) {
        // Select the created frames
        const createdFrames = result.frameIds
          .map(id => figma.getNodeById(id))
          .filter(node => node && node.type === 'FRAME') as FrameNode[]
        
        if (createdFrames.length > 0) {
          figma.currentPage.selection = createdFrames
          figma.viewport.scrollAndZoomIntoView(createdFrames)
        }
      }

    } catch (error) {
      result.errors.push(`Upload failed: ${error.message}`)
    }

    return result
  }

  private createResponsivePage(pageName: string): PageNode {
    // Check if page already exists
    const existingPage = figma.root.children.find(
      page => page.type === 'PAGE' && page.name === pageName
    ) as PageNode

    if (existingPage) {
      return existingPage
    }

    // Create new page
    const newPage = figma.createPage()
    newPage.name = pageName
    return newPage
  }

  private calculateFramePositions(
    variants: ResponsiveVariant[],
    originalFrame: FrameNode,
    options: UploadOptions
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = []
    const startX = originalFrame.x + originalFrame.width + options.spacing
    const startY = originalFrame.y

    switch (options.organization) {
      case 'horizontal':
        let currentX = startX
        for (const variant of variants) {
          positions.push({ x: currentX, y: startY })
          currentX += variant.width + options.spacing
        }
        break

      case 'vertical':
        let currentY = startY
        for (const variant of variants) {
          positions.push({ x: startX, y: currentY })
          currentY += originalFrame.height + options.spacing
        }
        break

      case 'grid':
        const columns = 2
        let row = 0
        let col = 0
        
        for (const variant of variants) {
          const x = startX + col * (Math.max(...variants.map(v => v.width)) + options.spacing)
          const y = startY + row * (originalFrame.height + options.spacing)
          
          positions.push({ x, y })
          
          col++
          if (col >= columns) {
            col = 0
            row++
          }
        }
        break
    }

    return positions
  }

  private async createFrameFromVariant(
    variant: ResponsiveVariant,
    originalFrame: FrameNode,
    position: { x: number; y: number },
    options: UploadOptions
  ): Promise<FrameNode | null> {
    try {
      // Create new frame
      const newFrame = figma.createFrame()
      newFrame.name = this.generateFrameName(variant, options)
      newFrame.x = position.x
      newFrame.y = position.y
      newFrame.resize(variant.width, originalFrame.height)

      // Copy frame properties
      this.copyFrameProperties(originalFrame, newFrame)

      // Reconstruct the design from serialized data
      await this.reconstructDesign(variant.transformedNode, newFrame)

      // Add breakpoint metadata
      newFrame.setPluginData('breakpoint', variant.breakpoint)
      newFrame.setPluginData('targetWidth', variant.width.toString())
      newFrame.setPluginData('optimizations', JSON.stringify(variant.optimizations))

      return newFrame
    } catch (error) {
      console.error('Error creating frame from variant:', error)
      return null
    }
  }

  private async reconstructDesign(serializedNode: SerializedNode, targetFrame: FrameNode): Promise<void> {
    // Clear existing content
    targetFrame.children.forEach(child => child.remove())

    // Reconstruct from serialized data
    await this.reconstructNode(serializedNode, targetFrame)
  }

  private async reconstructNode(serializedNode: SerializedNode, parent: BaseNode & ChildrenMixin): Promise<SceneNode | null> {
    let newNode: SceneNode | null = null

    try {
      // Create node based on type
      switch (serializedNode.nodeType) {
        case 'FRAME':
          newNode = figma.createFrame()
          break
        case 'RECTANGLE':
          newNode = figma.createRectangle()
          break
        case 'TEXT':
          newNode = figma.createText()
          break
        case 'GROUP':
          newNode = figma.group([], parent as BaseNode & ChildrenMixin)
          break
        default:
          // For unsupported types, create a rectangle placeholder
          newNode = figma.createRectangle()
          break
      }

      if (!newNode) return null

      // Apply basic properties
      newNode.name = serializedNode.name
      newNode.visible = serializedNode.visible
      newNode.x = serializedNode.geometry.x
      newNode.y = serializedNode.geometry.y
      newNode.resize(serializedNode.geometry.width, serializedNode.geometry.height)

      // Apply auto layout if applicable
      if (serializedNode.autoLayout && 'layoutMode' in newNode) {
        const frameNode = newNode as FrameNode
        frameNode.layoutMode = serializedNode.autoLayout.direction
        frameNode.paddingLeft = serializedNode.autoLayout.paddingLeft
        frameNode.paddingRight = serializedNode.autoLayout.paddingRight
        frameNode.paddingTop = serializedNode.autoLayout.paddingTop
        frameNode.paddingBottom = serializedNode.autoLayout.paddingBottom
        frameNode.itemSpacing = serializedNode.autoLayout.itemSpacing
        frameNode.primaryAxisSizingMode = serializedNode.autoLayout.primaryAxisSizingMode
        frameNode.counterAxisSizingMode = serializedNode.autoLayout.counterAxisSizingMode
        frameNode.primaryAxisAlignItems = serializedNode.autoLayout.primaryAxisAlignItems
        frameNode.counterAxisAlignItems = serializedNode.autoLayout.counterAxisAlignItems
      }

      // Apply layout properties if applicable
      if (serializedNode.layoutProperties && 'layoutAlign' in newNode) {
        newNode.layoutAlign = serializedNode.layoutProperties.layoutAlign
        newNode.layoutGrow = serializedNode.layoutProperties.layoutGrow
      }

      // Apply constraints if applicable
      if (serializedNode.constraints && 'constraints' in newNode) {
        newNode.constraints = serializedNode.constraints
      }

      // Handle text content
      if (serializedNode.content && newNode.type === 'TEXT') {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" })
        const textNode = newNode as TextNode
        textNode.characters = serializedNode.content
      }

      // Handle image fills
      if (serializedNode.isImage && 'fills' in newNode) {
        // Create a placeholder for images (in real implementation, you'd preserve the actual image)
        newNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
      }

      // Add to parent
      if ('appendChild' in parent) {
        parent.appendChild(newNode)
      }

      // Recursively create children
      if (serializedNode.children && 'children' in newNode) {
        for (const childData of serializedNode.children) {
          await this.reconstructNode(childData, newNode as BaseNode & ChildrenMixin)
        }
      }

      return newNode
    } catch (error) {
      console.error('Error reconstructing node:', error)
      return null
    }
  }

  private copyFrameProperties(source: FrameNode, target: FrameNode): void {
    try {
      // Copy visual properties
      if (source.fills !== figma.mixed) {
        target.fills = source.fills
      }
      
      if (source.strokes !== figma.mixed) {
        target.strokes = source.strokes
      }
      
      target.strokeWeight = source.strokeWeight
      target.cornerRadius = source.cornerRadius
      target.effects = source.effects

      // Copy layout properties if source has auto layout
      if (source.layoutMode !== 'NONE') {
        target.layoutMode = source.layoutMode
        target.primaryAxisSizingMode = source.primaryAxisSizingMode
        target.counterAxisSizingMode = source.counterAxisSizingMode
        target.primaryAxisAlignItems = source.primaryAxisAlignItems
        target.counterAxisAlignItems = source.counterAxisAlignItems
        target.paddingLeft = source.paddingLeft
        target.paddingRight = source.paddingRight
        target.paddingTop = source.paddingTop
        target.paddingBottom = source.paddingBottom
        target.itemSpacing = source.itemSpacing
      }
    } catch (error) {
      console.error('Error copying frame properties:', error)
    }
  }

  private generateFrameName(variant: ResponsiveVariant, options: UploadOptions): string {
    let name = options.naming.prefix

    if (options.naming.includeBreakpoint) {
      name += ` - ${variant.breakpoint.charAt(0).toUpperCase() + variant.breakpoint.slice(1)}`
    }

    if (options.naming.includeDimensions) {
      name += ` (${variant.width}px)`
    }

    return name
  }

  private addResponsiveIndicators(
    frameIds: string[],
    variants: ResponsiveVariant[],
    options: UploadOptions
  ): void {
    frameIds.forEach((frameId, index) => {
      const frame = figma.getNodeById(frameId) as FrameNode
      if (!frame) return

      const variant = variants[index]
      
      // Create indicator
      const indicator = figma.createFrame()
      indicator.name = "Responsive Indicator"
      indicator.resize(frame.width, 30)
      indicator.fills = [{ 
        type: 'SOLID', 
        color: this.getBreakpointColor(variant.breakpoint),
        opacity: 0.9 
      }]
      
      // Add text label
      const label = figma.createText()
      label.name = "Breakpoint Label"
      
      // Load font and set text
      figma.loadFontAsync({ family: "Inter", style: "Medium" }).then(() => {
        label.characters = `${variant.breakpoint.toUpperCase()} - ${variant.width}px`
        label.fontSize = 12
        label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
        
        // Center the text
        label.x = (indicator.width - label.width) / 2
        label.y = (indicator.height - label.height) / 2
        
        indicator.appendChild(label)
      })
      
      // Position indicator
      indicator.x = 0
      indicator.y = 0
      
      frame.appendChild(indicator)
    })
  }

  private createResponsiveDocumentation(
    variants: ResponsiveVariant[],
    targetPage: PageNode,
    options: UploadOptions
  ): void {
    // Create documentation frame
    const docFrame = figma.createFrame()
    docFrame.name = "Responsive Design Documentation"
    docFrame.resize(400, 600)
    docFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
    
    // Position documentation
    const lastVariant = variants[variants.length - 1]
    docFrame.x = 0
    docFrame.y = -docFrame.height - 50

    // Add title
    figma.loadFontAsync({ family: "Inter", style: "Bold" }).then(() => {
      const title = figma.createText()
      title.characters = "Responsive Variants"
      title.fontSize = 18
      title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
      title.x = 20
      title.y = 20
      docFrame.appendChild(title)

      // Add variant information
      let currentY = 60
      variants.forEach((variant, index) => {
        const info = figma.createText()
        info.characters = `${variant.breakpoint.toUpperCase()}: ${variant.width}px\nOptimizations: ${variant.optimizations.join(', ')}`
        info.fontSize = 12
        info.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        info.x = 20
        info.y = currentY
        docFrame.appendChild(info)
        currentY += 80
      })
    })

    targetPage.appendChild(docFrame)
  }

  private getBreakpointColor(breakpoint: string): { r: number; g: number; b: number } {
    const colors = {
      desktop: { r: 0.05, g: 0.3, b: 0.6 },   // Blue
      tablet: { r: 0.4, g: 0.2, b: 0.6 },     // Purple  
      mobile: { r: 0.1, g: 0.6, b: 0.3 }      // Green
    }
    return colors[breakpoint] || { r: 0.5, g: 0.5, b: 0.5 }
  }
}