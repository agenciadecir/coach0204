'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ExternalLink, Package, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: string
  originalPrice: string | null
  imageUrl: string
  productUrl: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export function StoreView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-orange-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Tienda vacía</h3>
        <p className="text-slate-400">Aún no hay productos disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Tienda</h1>
          <p className="text-sm text-slate-400">Productos recomendados para tu entrenamiento</p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <Card 
            key={product.id} 
            className="bg-slate-800/50 border-slate-700/50 overflow-hidden hover:border-orange-500/50 transition-all duration-300 group"
          >
            <div className="aspect-square relative overflow-hidden bg-slate-900/50">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Imagen+no+disponible'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium text-white line-clamp-2 mb-2 min-h-[48px]">
                {product.name}
              </h3>
              <div className="mb-3">
                {product.originalPrice && (
                  <p className="text-sm text-slate-400 line-through">
                    {product.originalPrice}
                  </p>
                )}
                <p className="text-xl font-bold text-orange-400">
                  {product.price}
                </p>
              </div>
              {product.description && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                  {product.description}
                </p>
              )}
              <Button
                onClick={() => window.open(product.productUrl, '_blank')}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Mercado Libre
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
