import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';

export function ProductGallery({ product }) {
  const images = Array.isArray(product.images) && product.images.length ? product.images : [product.imageUrl || '/demo/placeholder.svg'];
  const [index,setIndex] = useState(0);
  const [zoom,setZoom] = useState(false);
  useEffect(()=>{setIndex(0);setZoom(false);},[product.id]);
  useEffect(()=>{ if (!zoom) return; const onEscape = event => { if (event.key === 'Escape') setZoom(false); }; document.addEventListener('keydown', onEscape); return () => document.removeEventListener('keydown', onEscape); },[zoom]);
  const active = images[Math.min(index,images.length-1)];
  const change = next => setIndex((next+images.length)%images.length);
  return <div className="product-gallery"><div className="gallery-main"><img src={active} alt={`${product.title} — image ${index+1} of ${images.length}`}/>{product.featured&&<span className="product-tag">FEATURED FIND</span>}<button type="button" className="gallery-zoom" aria-label="View larger product photo" onClick={()=>setZoom(true)}><ZoomIn size={19}/></button>{images.length>1&&<><button type="button" className="gallery-prev" aria-label="Previous image" onClick={()=>change(index-1)}><ChevronLeft size={20}/></button><button type="button" className="gallery-next" aria-label="Next image" onClick={()=>change(index+1)}><ChevronRight size={20}/></button></>}</div>{images.length>1&&<div className="gallery-thumbnails" aria-label="Product images">{images.map((src,i)=><button type="button" key={`${src}-${i}`} className={i===index?'selected':''} onClick={()=>setIndex(i)} aria-label={`View image ${i+1}`} aria-pressed={i===index}><img src={src} alt=""/></button>)}</div>}{zoom&&<div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Larger product photo" onClick={()=>setZoom(false)}><button className="lightbox-close" type="button" aria-label="Close enlarged image" onClick={()=>setZoom(false)}><X size={24}/></button><img onClick={e=>e.stopPropagation()} src={active} alt={`${product.title} enlarged`}/></div>}</div>;
}
