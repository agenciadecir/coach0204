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

    // Extract price - prioritize DISCOUNT/PROMOTIONAL price over list price
    let price = ''

    // Method 1: Look for the main promotional price (green price, not strikethrough)
    // This finds the price in the main price container that has a discount
    // Pattern: find price that has a discount percentage nearby (like "20% OFF")
    const discountContainerMatch = html.match(/andes-money-amount--discount[^>]*>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    if (discountContainerMatch) {
      price = '$ ' + cleanHtml(discountContainerMatch[1])
      console.log('Found discount price:', price)
    }

    // Method 2: Find price that's NOT inside a strikethrough (s) tag
    // Look for the main price container without previous-price class
    if (!price) {
      // Find all price fractions and filter out the ones that are struck through (original price)
      const allPriceMatches = html.matchAll(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)
      const prices: string[] = []
      for (const match of allPriceMatches) {
        // Check if this price is inside a strikethrough or previous-price context
        const beforeMatch = html.substring(Math.max(0, match.index! - 500), match.index)
        const afterMatch = html.substring(match.index!, match.index! + 200)

        // Skip if it's a struck-through price (original price)
        const isStruckThrough = beforeMatch.includes('<s>') || beforeMatch.includes('</s>') ||
                                beforeMatch.includes('price-tag-text-s') ||
                                beforeMatch.includes('andes-money-amount--previous') ||
                                beforeMatch.includes('previous-price') ||
                                afterMatch.includes('</s>')

        // This is likely the promotional price if there's a discount indicator nearby
        const hasDiscountNearby = beforeMatch.includes('OFF') || afterMatch.includes('OFF') ||
                                   beforeMatch.includes('discount') || afterMatch.includes('discount') ||
                                   beforeMatch.includes('%') || afterMatch.includes('%')

        if (!isStruckThrough) {
          prices.push(cleanHtml(match[1]))
          if (hasDiscountNearby) {
            // Prioritize this price as it has discount indicator
            price = '$ ' + cleanHtml(match[1])
            console.log('Found price with discount nearby:', price)
            break
          }
        }
      }

      // If no discount price found, use the first non-struck-through price
      if (!price && prices.length > 0) {
        price = '$ ' + prices[0]
        console.log('Using first available price:', price)
      }
    }

    // Method 3: Try price-tag-fraction (older ML design)
    if (!price) {
      const priceTagMatch = html.match(/<span[^>]*class="[^"]*price-tag-fraction[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
      if (priceTagMatch) {
        price = '$ ' + cleanHtml(priceTagMatch[1])
      }
    }

    // Method 4: Last resort - meta product:price:amount (often the list price)
    if (!price) {
      const metaPriceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
      if (metaPriceMatch) {
        const priceNum = parseFloat(metaPriceMatch[1])
        price = formatPrice(priceNum)
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
