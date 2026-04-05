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
      orderBy: { createdAt: 'desc' },
      include: {
        category: true
      }
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
    const { productUrl, name, price, imageUrl, description, categoryId } = body

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
          description: description || null,
          categoryId: categoryId || null
        },
        include: {
          category: true
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
        description: description || null,
        categoryId: categoryId || null
      },
      include: {
        category: true
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

// Extract product info from Mercado Libre
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
    if (!finalUrl.includes('mercadolibre')) {
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
    
    const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch) {
      name = cleanHtml(titleMatch[1])
    }
    
    if (!name) {
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      if (ogTitleMatch) {
        name = ogTitleMatch[1]
      }
    }

    if (!name) {
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleTagMatch) {
        name = titleTagMatch[1].split('|')[0].trim()
      }
    }

    // ========================================
    // EXTRACT PRICES
    // ========================================
    let currentPrice = ''  // Precio real de venta
    let originalPrice = '' // Precio de lista tachado

    // Method 1: Use meta tag (most reliable)
    const metaPriceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
    if (metaPriceMatch) {
      const priceNum = parseFloat(metaPriceMatch[1])
      if (priceNum > 0) {
        currentPrice = formatPrice(priceNum)
        console.log('Found price from meta tag:', currentPrice)
      }
    }

    // Method 2: Look for price in JSON-LD structured data
    if (!currentPrice) {
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonStr = match.replace(/<[^>]*>/g, '')
            const jsonData = JSON.parse(jsonStr)
            if (jsonData.offers && jsonData.offers.price) {
              currentPrice = formatPrice(parseFloat(jsonData.offers.price))
              console.log('Found price from JSON-LD:', currentPrice)
              break
            }
          } catch {
            // Continue to next match
          }
        }
      }
    }

    // Method 3: Find price in ui-pdp-price__second-line__content (current price container)
    if (!currentPrice) {
      const currentPriceMatch = html.match(/class="[^"]*ui-pdp-price__second-line__content[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      if (currentPriceMatch) {
        currentPrice = '$ ' + cleanHtml(currentPriceMatch[1])
        console.log('Found price from second-line__content:', currentPrice)
      }
    }

    // Method 4: Find all prices and identify which is which
    if (!currentPrice) {
      // Find the main price container
      const mainPriceContainer = html.match(/<div[^>]*class="[^"]*ui-pdp-price[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)
      
      if (mainPriceContainer) {
        const priceHtml = mainPriceContainer[1]
        
        // Find struck-through price (original/list price)
        const struckMatch = priceHtml.match(/<s[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/s>/i)
        if (struckMatch) {
          originalPrice = '$ ' + cleanHtml(struckMatch[1])
          console.log('Found struck-through (original) price:', originalPrice)
        }
        
        // Find price with "previous" class (also original price)
        const previousMatch = priceHtml.match(/<div[^>]*class="[^"]*andes-money-amount--previous[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
        if (previousMatch && !originalPrice) {
          originalPrice = '$ ' + cleanHtml(previousMatch[1])
          console.log('Found previous class price:', originalPrice)
        }
        
        // Get all prices in this container
        const allPrices = [...priceHtml.matchAll(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
        
        // The current price is the one that's NOT struck-through or previous
        for (const priceMatch of allPrices) {
          const priceValue = cleanHtml(priceMatch[1])
          const startPos = priceMatch.index!
          const contextBefore = priceHtml.substring(Math.max(0, startPos - 300), startPos)
          
          // Skip if this price is struck-through or marked as previous
          const isStruckThrough = contextBefore.includes('<s') || contextBefore.includes('</s>')
          const isPrevious = contextBefore.includes('previous') || contextBefore.includes('andes-money-amount--previous')
          
          if (!isStruckThrough && !isPrevious) {
            currentPrice = '$ ' + priceValue
            console.log('Found current price:', currentPrice)
            break
          }
        }
      }
    }

    // Method 5: Fallback - find first non-previous price
    if (!currentPrice) {
      const allPriceMatches = [...html.matchAll(/<div[^>]*class="[^"]*andes-money-amount[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
      
      for (const match of allPriceMatches) {
        const fullMatch = match[0]
        const priceValue = cleanHtml(match[1])
        const matchIndex = match.index!
        const contextBefore = html.substring(Math.max(0, matchIndex - 500), matchIndex)
        
        // Skip struck-through or previous prices
        const isOld = fullMatch.includes('previous') || 
                      fullMatch.includes('<s') || 
                      contextBefore.includes('previous') ||
                      contextBefore.includes('<s>')
        
        // Skip recommendation/related products
        const isRecommendation = contextBefore.includes('recommendation') || 
                                  contextBefore.includes('carousel') ||
                                  contextBefore.includes('related')
        
        if (!isOld && !isRecommendation) {
          currentPrice = '$ ' + priceValue
          console.log('Found price from fallback:', currentPrice)
          break
        } else if (isOld && !originalPrice) {
          originalPrice = '$ ' + priceValue
        }
      }
    }

    // Method 6: Last resort - find any price pattern
    if (!currentPrice) {
      const pricePatterns = html.match(/\$\s*[\d.,]+/g)
      if (pricePatterns && pricePatterns.length > 0) {
        // Take the first one that looks reasonable
        for (const p of pricePatterns) {
          const cleanP = p.replace(/\s+/g, ' ').trim()
          if (cleanP.length > 3) {
            currentPrice = cleanP
            console.log('Found price from pattern:', currentPrice)
            break
          }
        }
      }
    }

    // Extract image
    let imageUrl = ''
    
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
    }

    if (!imageUrl) {
      const imgZoomMatch = html.match(/<img[^>]*data-zoom="([^"]+)"/i)
      if (imgZoomMatch) {
        imageUrl = imgZoomMatch[1]
      }
    }

    if (!imageUrl) {
      const imgSrcMatch = html.match(/<img[^>]*(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*ui-pdp-image[^"]*"/i)
      if (imgSrcMatch) {
        imageUrl = imgSrcMatch[1]
      }
    }

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
