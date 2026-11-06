import { useState } from 'react'
import { X } from 'lucide-react'

export default function ProductFormModal({ categories, suppliers = [], initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? { name:initial.name,sku:initial.sku,categoryId:initial.categoryId||categories.find(c=>c.name===initial.category)?.id||'',stock:initial.onHand??initial.stock,reorderPoint:initial.reorderPoint,price:initial.price,supplierId:initial.supplierId||'',stockReason:'' } : { name: '', sku: '', categoryId: '', stock: '', reorderPoint: '10', price: '', supplierId:'',stockReason:'' })
  const [error, setError] = useState('')
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setError('')
    try { const initialStock=initial?.onHand??initial?.stock;const payload={...form,sku:form.sku.trim(),reorderPoint:Number(form.reorderPoint),price:Number(form.price),stock:Number(form.stock)};if(initial&&payload.stock===Number(initialStock)){delete payload.stock;delete payload.stockReason}if(initial&&payload.stock!==undefined&&!payload.stockReason.trim())throw new Error('Enter a reason for the stock adjustment.');await onSave(payload) }
    catch (requestError) { setError(requestError.message || 'Product could not be saved.') }
  }

  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <div className="modal-heading"><div><h2 id="product-modal-title">{initial?'Edit product':'Add product'}</h2><p>{import.meta.env.VITE_DATA_SOURCE === 'api' ? 'Saved in the connected workspace.' : 'Saved to this sample session only.'}</p></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
      <form onSubmit={submit}>
        <label>Product name<input name="name" value={form.name} onChange={update} required autoFocus maxLength="160" /></label>
        <div className="form-row"><label>SKU<input name="sku" value={form.sku} onChange={update} required maxLength="80" pattern="[A-Za-z0-9][A-Za-z0-9._/-]{0,79}" title="Use letters, numbers, dots, underscores, slashes or hyphens." /></label><label>Category<select name="categoryId" value={form.categoryId} onChange={update} required><option value="">Choose category</option>{categories.filter(c=>c.active!==false).map((category) => <option key={category.id} value={category.id}>{category.parentName?`${category.parentName} / `:''}{category.name}</option>)}</select></label></div>
        <div className="form-row"><label>{initial?'Current stock':'Opening stock'}<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={update} required /></label><label>Reorder point<input name="reorderPoint" type="number" min="0" step="1" value={form.reorderPoint} onChange={update} required /></label></div>{initial&&Number(form.stock)!==Number(initial.onHand??initial.stock)&&<label>Stock adjustment reason<input name="stockReason" value={form.stockReason} onChange={update} required maxLength="500" placeholder="Explain the stock count correction"/></label>}<div className="form-row"><label>Unit price<input name="price" type="number" min="0" step="0.01" value={form.price} onChange={update} required /></label><label>Supplier<select name="supplierId" value={form.supplierId} onChange={update}><option value="">No supplier</option>{suppliers.filter(s=>s.status!=='Inactive').map((supplier)=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{initial?'Save changes':import.meta.env.VITE_DATA_SOURCE === 'api' ? 'Save product' : 'Save sample product'}</button></div>
      </form>
    </section>
  </div>
}
