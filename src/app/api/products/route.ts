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

    // Extract price - Mercado Libre structure:
    // - Original price (tachado/struck-through) - usually has class "previous" or inside <s> tags
    // - Current price (con descuento) - the ACTUAL price the customer pays
    // We need to find the CURRENT price, not the original struck-through price
    
    let price = ''
    
    // Method 1: Find price in the MAIN price container (not struck-through)
    // Look for andes-money-amount that does NOT have "previous" class
    // The main price container usually has classes like "andes-money-amount--discount" or no special class
    
    // First, find all price containers and their context
    const allPriceMatches = [...html.matchAll(/<div[^>]*class="[^"]*andes-money-amount[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)]
    console.log('Found', allPriceMatches.length, 'price containers')
    
    for (const match of allPriceMatches) {
      const containerHtml = match[0]
      const containerClass = containerHtml.match(/class="([^"]*)"/i)?.[1] || ''
      const startIndex = match.index!
      const contextBefore = html.substring(Math.max(0, startIndex - 500), startIndex)
      
      // Check if this is a PREVIOUS/struck-through price - SKIP THESE
      const isPrevious = 
        containerClass.includes('previous') ||
        containerClass.includes('andes-money-amount--previous') ||
        contextBefore.includes('<s>') ||
        contextBefore.includes('</s>')
      
      if (isPrevious) {
        // Extract price for logging
        const prevPriceMatch = containerHtml.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
        if (prevPriceMatch) {
          console.log('Skipping PREVIOUS price:', cleanHtml(prevPriceMatch[1]))
        }
        continue
      }
      
      // This should be the CURRENT price (with discount if applicable)
      // Check if it's the main product price (in the price section, not recommendations)
      const isInMainSection = 
        contextBefore.includes('ui-pdp-price') ||
        contextBefore.includes('price-tag') ||
        contextBefore.includes('ui-pdp-container') ||
        contextBefore.includes('short-description')
      
      // Skip if it's in recommendations/related products
      const isInRecommendations = 
        contextBefore.includes('recommendation') ||
        contextBefore.includes('related') ||
        contextBefore.includes('carousel') ||
        contextBefore.includes('also-viewed') ||
        contextBefore.includes('advertising') ||
        contextBefore.includes('otros-vendedores')
      
      if (isInRecommendations) {
        console.log('Skipping recommendation price')
        continue
      }
      
      // Extract the price from this container
      const priceMatch = containerHtml.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      if (priceMatch) {
        const priceValue = cleanHtml(priceMatch[1])
        console.log('Found current price:', priceValue, 'in main section:', isInMainSection, 'class:', containerClass)
        
        // If this is in the main price section, use it
        if (isInMainSection) {
          price = '$ ' + priceValue
          console.log('Using MAIN SECTION price:', price)
          break
        }
        
        // Otherwise save it as a candidate
        if (!price && !isPrevious) {
          price = '$ ' + priceValue
          console.log('Using first valid price:', price)
        }
      }
    }
    
    // Method 2: Fallback - Find the first andes-money-amount__fraction that's NOT in a struck-through context
    if (!price) {
      const allFractionMatches = [...html.matchAll(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
      
      for (const match of allFractionMatches) {
        const priceValue = cleanHtml(match[1])
        const contextBefore = html.substring(Math.max(0, match.index! - 400), match.index!)
        const contextAfter = html.substring(match.index!, match.index! + 200)
        
        // Check if this price is struck-through
        const isStruckThrough = 
          contextBefore.includes('<s>') ||
          contextBefore.includes('andes-money-amount--previous') ||
          contextBefore.includes('previous') ||
          contextAfter.includes('</s>')
        
        if (isStruckThrough) {
          console.log('Fallback - skipping struck-through price:', priceValue)
          continue
        }
        
        // Skip if in recommendations
        const isInRecommendations = 
          contextBefore.includes('recommendation') ||
          contextBefore.includes('related') ||
          contextBefore.includes('carousel') ||
          contextBefore.includes('otros-vendedores')
        
        if (isInRecommendations) {
          console.log('Fallback - skipping recommendation price:', priceValue)
          continue
        }
        
        price = '$ ' + priceValue
        console.log('Fallback - using price:', price)
        break
      }
    }

    // Method 3: Try price-tag-fraction (older ML design)
    if (!price) {
      const priceTagMatch = html.match(/<span[^>]*class="[^"]*price-tag-fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      if (priceTagMatch) {
        price = '$ ' + cleanHtml(priceTagMatch[1])
        console.log('Found price from price-tag-fraction:', price)
      }
    }

    // Method 4: Meta tag (last resort, may not always be accurate)
    if (!price) {
      const metaPriceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
      if (metaPriceMatch) {
        const priceNum = parseFloat(metaPriceMatch[1])
        if (priceNum > 0) {
          price = formatPrice(priceNum)
          console.log('Found price from meta tag:', price)
        }
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

    // Another fallback: find any large image fromML static
    if (!imageUrl) {
      const mlImgMatch = html.match(/https?:\/\/http2\.mlstatic\.com\/[^\s"']+\.(?:jpg|jpeg|png|webp)/i)
      if (mlImgMatch) {
        imageUrl = mlImgMatch[0]
      }
    }

    console.log('Extracted:', { name: name?.substring(0, 50), price, imageUrl: imageUrl?.substring(0, 50) })

    if (!name || !imageUrl) {
      console.error('Could not extract required fields')
      return null
    }

    return {
      name,
      price: price || 'Consultar precio',
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
