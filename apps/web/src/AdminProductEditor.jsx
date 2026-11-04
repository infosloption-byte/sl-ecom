import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { api, lkr } from './api';
import { Dropdown, Field, Spinner, TextAreaField } from './components';
import { useStore } from './context';

const empty = { title:'', slug:'', sku:'', shortDescription:'', description:'', imageUrl:'', images:[], specifications:[], priceCents:0, compareAtCents:null, stock:0, featured:false, status:'DRAFT', categoryId:'' };

export function AdminProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useStore();
  const [data, setData] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const change = (name, value) => setData(prev => ({ ...prev, [name]:value }));
  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    Promise.all([api('/admin/categories'), id ? api('/admin/products/'+id) : Promise.resolve(null)]).then(([cats,product]) => {
      if (!alive) return;
      setCategories(cats);
      setData(product ? { ...empty, ...product,
        images: Array.isArray(product.images) && product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
        specifications: Array.isArray(product.specifications) ? product.specifications : []
      } : { ...empty, categoryId: cats.find(c=>c.active)?.id || cats[0]?.id || '' });
    }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);
  async function upload(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (selected.some(file => file.size > 5*1024*1024)) return notify('Each image must be 5 MB or less.');
    if (selected.length + data.images.length > 8) return notify('Use a maximum of 8 product images.');
    setUploading(true);
    const uploaded = [];
    try {
      for (const file of selected) { const form = new FormData(); form.append('image',file); const result = await api('/admin/upload',{method:'POST',body:form}); uploaded.push(result.imageUrl); }
      setData(prev=>({...prev,images:[...prev.images,...uploaded].slice(0,8)}));
      notify(uploaded.length+' photos uploaded.');
    } catch(e) { notify(e.message); }
    finally { setUploading(false); }
  }
  function moveImage(index,delta) {
    setData(prev => { const images=[...prev.images], to=index+delta; if(to<0||to>=images.length)return prev; [images[index],images[to]]=[images[to],images[index]]; return {...prev,images}; });
  }
  function setSpec(index,key,value) { setData(prev=>({...prev,specifications:prev.specifications.map((row,i)=>i===index?{...row,[key]:value}:row)})); }
  async function save(e) {
    e.preventDefault(); if(!data.categoryId)return notify('Create a category first.');
    setBusy(true);
    try {
      const images=data.images.filter(Boolean).slice(0,8);
      const body={
        title:data.title, ...(data.slug?.trim()?{slug:data.slug.trim()}:{}),
        sku:data.sku?.trim()||null, shortDescription:data.shortDescription?.trim()||null,
        description:data.description||'', imageUrl:images[0]||'', images,
        specifications:data.specifications.filter(r=>r.label.trim()&&r.value.trim()).map(r=>({label:r.label.trim(),value:r.value.trim()})),
        priceCents:Number(data.priceCents), compareAtCents:data.compareAtCents?Number(data.compareAtCents):null,
        stock:Number(data.stock),featured:!!data.featured,status:data.status,categoryId:data.categoryId
      };
      await api(isNew?'/admin/products':'/admin/products/'+id,{method:isNew?'POST':'PUT',body});
      notify(isNew?'Product created.':'Product saved.');navigate('/admin?tab=products');
    } catch(e) { notify(e.message); } finally { setBusy(false); }
  }
  if(loading)return <Spinner/>;
  if(error)return <div className="admin-panel"><h2>Unable to load product</h2><p>{error}</p><Link className="button button-outline" to="/admin?tab=products">Back to products</Link></div>;
  return <div className="product-editor-page"><div className="admin-page-head"><div><Link className="order-back" to="/admin?tab=products"><ArrowLeft size={17}/> Back to products</Link><span className="eyebrow">PRODUCT CATALOGUE</span><h1>{isNew?'Add a product.':'Edit product.'}</h1><p>Everything shoppers need to know, without clutter.</p></div><div className="editor-header-actions"><Link className="button button-outline" to="/admin?tab=products">Cancel</Link><button type="submit" form="product-editor" className="button button-dark" disabled={busy||uploading}>{busy?'Saving...':isNew?'Create product':'Save changes'} <ArrowRight size={17}/></button></div></div>
    <form id="product-editor" onSubmit={save} className="product-editor-grid"><div className="product-editor-main">
      <section className="admin-panel editor-panel"><h2>Basic information</h2><div className="form-grid"><div className="form-span"><Field label="Product name" maxLength={191} required value={data.title} onChange={e=>change('title',e.target.value)} placeholder="Product title"/></div><div className="form-span"><Field label="Short summary" maxLength={320} value={data.shortDescription||''} onChange={e=>change('shortDescription',e.target.value)} placeholder="One sentence about the item"/></div><div className="form-span"><TextAreaField label="Full description" maxLength={5000} rows={7} value={data.description||''} onChange={e=>change('description',e.target.value)} placeholder="Materials, use, care and what is included"/></div><Field label="SKU (optional)" maxLength={80} value={data.sku||''} onChange={e=>change('sku',e.target.value)} placeholder="SL-ITEM-01"/><Field label="URL slug (optional)" maxLength={191} value={data.slug||''} onChange={e=>change('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="Generated automatically"/></div></section>
      <section className="admin-panel editor-panel"><div className="editor-section-heading"><div><h2>Product images</h2><p>First image is the cover. Upload up to 8 images and reorder them.</p></div><label className="button button-outline editor-upload"><ImagePlus size={17}/>{uploading?'Uploading...':'Add photos'}<input disabled={uploading||data.images.length>=8} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{upload(e.target.files);e.target.value='';}}/></label></div><div className="editor-image-grid">{data.images.map((image,index)=><div className="editor-image-card" key={image+'-'+index}><img src={image} alt={'Product photo '+(index+1)}/>{index===0&&<span className="editor-cover-badge">COVER</span>}<div className="editor-image-actions"><button type="button" title="Move earlier" disabled={index===0} aria-label={'Move image '+(index+1)+' earlier'} onClick={()=>moveImage(index,-1)}><ChevronUp size={17}/></button><button type="button" title="Move later" disabled={index===data.images.length-1} aria-label={'Move image '+(index+1)+' later'} onClick={()=>moveImage(index,1)}><ChevronDown size={17}/></button><button type="button" title="Remove" aria-label={'Remove image '+(index+1)} onClick={()=>change('images',data.images.filter((_,i)=>i!==index))}><Trash2 size={17}/></button></div></div>)}{!data.images.length&&<div className="editor-image-empty"><ImagePlus size={25}/><b>No photos yet</b><span>JPG, PNG, WebP · 5 MB each</span></div>}</div></section>
      <section className="admin-panel editor-panel"><div className="editor-section-heading"><div><h2>Specifications</h2><p>Simple labels and values: Material / Cotton, Size / Medium.</p></div><button type="button" className="button button-outline" disabled={data.specifications.length>=12} onClick={()=>change('specifications',[...data.specifications,{label:'',value:''}])}><Plus size={17}/> Add specification</button></div><div className="editor-spec-list">{data.specifications.map((spec,index)=><div className="editor-spec-row" key={index}><Field label="Label" maxLength={80} value={spec.label} onChange={e=>setSpec(index,'label',e.target.value)} placeholder="Material"/><Field label="Value" maxLength={200} value={spec.value} onChange={e=>setSpec(index,'value',e.target.value)} placeholder="Cotton"/><button type="button" aria-label={'Remove specification '+(index+1)} onClick={()=>change('specifications',data.specifications.filter((_,i)=>i!==index))}><Trash2 size={18}/></button></div>)}{!data.specifications.length&&<p className="muted-note">No specifications added. This section is optional.</p>}</div></section>
    </div><aside className="product-editor-side"><section className="admin-panel editor-panel"><h2>Pricing & inventory</h2><Field label="Selling price (Rs.)" type="number" required min="1" step="0.01" value={data.priceCents/100} onChange={e=>change('priceCents',Math.round(Number(e.target.value)*100))}/><Field label="Compare-at price (Rs.)" type="number" min="0" step="0.01" value={data.compareAtCents?data.compareAtCents/100:''} onChange={e=>change('compareAtCents',e.target.value?Math.round(Number(e.target.value)*100):null)}/><Field label="Available stock" type="number" required min="0" step="1" value={data.stock} onChange={e=>change('stock',Number(e.target.value))}/><p className="muted-note">Selling price: {lkr(data.priceCents)}</p></section>
      <section className="admin-panel editor-panel"><h2>Visibility & category</h2><div className="field"><Dropdown label="Category" value={data.categoryId} options={categories.map(c=>({value:c.id,label:c.name}))} onChange={v=>change('categoryId',v)}/></div><div className="field"><Dropdown label="Visibility" value={data.status} options={[{value:'DRAFT',label:'Draft / hidden'},{value:'ACTIVE',label:'Active / visible'}]} onChange={v=>change('status',v)}/></div><label className="check-line"><input type="checkbox" checked={!!data.featured} onChange={e=>change('featured',e.target.checked)}/> Featured product</label></section><button className="button button-dark button-full" type="submit" disabled={busy||uploading||!data.categoryId}>{busy?'Saving...':isNew?'Create product':'Save changes'} <ArrowRight size={17}/></button></aside></form></div>;
}
