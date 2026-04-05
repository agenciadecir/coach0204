import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - List all active products (for students) or all products (for admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const products = await db.product.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST - Create a new product (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el admin puede crear productos.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { productUrl, name, price, imageUrl, description } = body

    // If productUrl is provided but not the other fields, extract from Mercado Libre
    if (productUrl && (!name || !price || !imageUrl)) {
      const extractedData = await extractMercadoLibreInfo(productUrl)
      
      if (!extractedData) {
        return NextResponse.json(
          { error: 'No se pudo extraer información del producto. Intenta con otro enlace o completa los datos manualmente.' },
          { status: 400 }
        )
      }

      const product = await db.product.create({
        data: {
          name: extractedData.name,
          price: extractedData.price,
          originalPrice: extractedData.originalPrice || null,
          imageUrl: extractedData.imageUrl,
          productUrl: productUrl,
          description: description || null
        }
      })

      return NextResponse.json(product)
    }

    // Manual creation with all fields
    if (!name || !price || !imageUrl || !productUrl) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, price, imageUrl, productUrl' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        price,
        imageUrl,
        productUrl,
        description: description || null
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}

// Resolve short URLs (like meli.la) to get the final URL
async function resolveShortUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    return response.url
  } catch {
    return url
  }
}

// Extract product info from Mercado Libre using direct fetch
async function extractMercadoLibreInfo(url: string): Promise<{
  name: string
  price: string
  originalPrice?: string
  imageUrl: string
} | null> {
  try {
    // Resolve short URLs (meli.la, etc.)
    let finalUrl = url
    if (url.includes('meli.la')) {
      console.log('Resolving meli.la URL...')
      finalUrl = await resolveShortUrl(url)
      console.log('Resolved to:', finalUrl)
    }

    // Validate it's a Mercado Libre URL
    if (!finalUrl.includes('mercadolibre.com.ar') && 
        !finalUrl.includes('mercadolibre.com') &&
        !finalUrl.includes('mercadolibre.cl') &&
        !finalUrl.includes('mercadolibre.com.mx')) {
      console.error('URL is not from Mercado Libre:', finalUrl)
      return null
    }

    // Fetch the page HTML
    console.log('Fetching page:', finalUrl)
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3',
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch page:', response.status)
      return null
    }

    const html = await response.text()
    console.log('Got HTML, length:', html.length)

    // Extract product name
    let name = ''
    
    // Try h1 with class ui-pdp-title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch) {
      name = cleanHtml(titleMatch[1])
    }
    
    // Fallback: try meta og:title
    if (!name) {
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      if (ogTitleMatch) {
        name = ogTitleMatch[1]
      }
    }

    // Fallback: try title tag
    if (!name) {
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleTagMatch) {
        name = titleTagMatch[1].split('|')[0].trim()
      }
    }

    // ========================================
    // EXTRACT PRICES - Mercado Libre Structure
    // ========================================
    // The HTML structure typically has:
    // 1. A container with "ui-pdp-price" class
    // 2. Inside: the original price (tachado) with class "previous" 
    // 3. The current price (precio real de venta) WITHOUT "previous" class
    
    let currentPrice = ''  // Precio real de venta (lo que queremos)
    let originalPrice = '' // Precio de lista tachado (opcional)
    
    // Find the main price section
    const priceSectionMatch = html.match(/<div[^>]*class="[^"]*ui-pdp-price[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)
    
    if (priceSectionMatch) {
      const priceSection = priceSectionMatch[1]
      console.log('Found price section, length:', priceSection.length)
      
      // Find all price values in this section
      const allPricesInSection = [...priceSection.matchAll(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
      
      console.log('Found', allPricesInSection.length, 'prices in main section')
      
      // Find which is original (has "previous" nearby) and which is current
      for (let i = 0; i < allPricesInSection.length; i++) {
        const match = allPricesInSection[i]
        const priceValue = cleanHtml(match[1])
        
        // Check context in the original HTML to determine if this is original or current price
        const fullMatchStart = match.index!
        const contextBefore = priceSection.substring(Math.max(0, fullMatchStart - 200), fullMatchStart)
        
        const isOriginal = 
          contextBefore.includes('previous') ||
          contextBefore.includes('<s>') ||
          contextBefore.includes('</s>')
        
        if (isOriginal) {
          originalPrice = '$ ' + priceValue
          console.log('Found ORIGINAL (tachado) price:', originalPrice)
        } else {
          // If we haven't found a current price yet, this is it
          if (!currentPrice) {
            currentPrice = '$ ' + priceValue
            console.log('Found CURRENT (real de venta) price:', currentPrice)
          }
        }
      }
    }
    
    // Fallback 1: Look for andes-money-amount with specific class patterns
    if (!currentPrice) {
      // Pattern 1: Price with discount class (andes-money-amount--discount)
      const discountPriceMatch = html.match(/<div[^>]*class="[^"]*andes-money-amount--discount[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      if (discountPriceMatch) {
        currentPrice = '$ ' + cleanHtml(discountPriceMatch[1])
        console.log('Found price from discount class:', currentPrice)
      }
    }
    
    // Fallback 2: Look for the first price NOT in "previous" container
    if (!currentPrice) {
      const allPriceContainers = [...html.matchAll(/<div[^>]*class="[^"]*andes-money-amount(?:\s|["'])[^(previous)]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
      
      for (const match of allPriceContainers) {
        const containerClass = match[0].match(/class="([^"]*)"/i)?.[1] || ''
        const priceValue = cleanHtml(match[1])
        const contextBefore = html.substring(Math.max(0, match.index! - 300), match.index!)
        
        // Skip if this is the previous/original price
        if (containerClass.includes('previous') || contextBefore.includes('previous') || contextBefore.includes('<s>')) {
          if (!originalPrice) {
            originalPrice = '$ ' + priceValue
            console.log('Found original price in fallback:', originalPrice)
          }
          continue
        }
        
        // Skip if in recommendations section
        if (contextBefore.includes('recommendation') || contextBefore.includes('related') || contextBefore.includes('carousel')) {
          console.log('Skipping recommendation price:', priceValue)
          continue
        }
        
        currentPrice = '$ ' + priceValue
        console.log('Found current price in fallback:', currentPrice)
        break
      }
    }
    
    // Fallback 3: Use og:price:amount meta tag
    if (!currentPrice) {
      const metaPriceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
      if (metaPriceMatch) {
        const priceNum = parseFloat(metaPriceMatch[1])
        if (priceNum > 0) {
          currentPrice = formatPrice(priceNum)
          console.log('Found price from meta tag:', currentPrice)
        }
      }
    }
    
    // Fallback 4: Look for any price pattern
    if (!currentPrice) {
      const pricePatternMatch = html.match(/\$\s*[\d.,]+/g)
      if (pricePatternMatch && pricePatternMatch.length > 0) {
        currentPrice = pricePatternMatch[0].replace(/\s+/g, ' ').trim()
        console.log('Found price from pattern:', currentPrice)
      }
    }

    // Extract image
    let imageUrl = ''
    
    // Try meta og:image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
    }

    // Fallback: try data-zoom on images
    if (!imageUrl) {
      const imgZoomMatch = html.match(/<img[^>]*data-zoom="([^"]+)"/i)
      if (imgZoomMatch) {
        imageUrl = imgZoomMatch[1]
      }
    }

    // Fallback: try ui-pdp-gallery image
    if (!imageUrl) {
      const imgSrcMatch = html.match(/<img[^>]*(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*ui-pdp-image[^"]*"/i)
      if (imgSrcMatch) {
        imageUrl = imgSrcMatch[1]
      }
    }

    // Another fallback: find any large image from ML static
    if (!imageUrl) {
      const mlImgMatch = html.match(/https?:\/\/http2\.mlstatic\.com\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i)
      if (mlImgMatch) {
        imageUrl = mlImgMatch[0]
      }
    }

    console.log('Extracted:', { 
      name: name?.substring(0, 50), 
      currentPrice, 
      originalPrice,
      imageUrl: imageUrl?.substring(0, 50) 
    })

    if (!name || !imageUrl) {
      console.error('Could not extract required fields')
      return null
    }

    return {
      name,
      price: currentPrice || 'Consultar precio',
      originalPrice: originalPrice || undefined,
      imageUrl
    }
  } catch (error) {
    console.error('Error extracting Mercado Libre info:', error)
    return null
  }
}

function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatPrice(amount: number): string {
  return '$ ' + amount.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}
